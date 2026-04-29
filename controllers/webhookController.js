const {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendProductCardMessage
} = require('../services/whatsappService');

const {
    Category,
    Product,
    Order,
    Customer,
    Branch
} = require('../models');

const { Op } = require('sequelize');

const sessions = {};

const carts = {};

const verifyWebhook = (req, res) => {

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
        mode &&
        token === process.env.VERIFY_TOKEN
    ) {

        console.log('Webhook verified');

        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
};

const receiveWebhook = async (req, res) => {

    try {

        console.log(
            JSON.stringify(req.body, null, 2)
        );

        const message =
            req.body.entry?.[0]
            ?.changes?.[0]
            ?.value?.messages?.[0];

        if (message) {

            const from = message.from;
            const profileName = req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || '';

            // =========================
            // DATA RECOVERY (Customer & Latest Order)
            // =========================
            const customer = await Customer.findOne({ where: { phone: from } });
            const latestOrder = await Order.findOne({ 
                where: { customerPhone: from }, 
                order: [['createdAt', 'DESC']] 
            });

            // Upsert Customer
            try {
                await Customer.upsert({
                    phone: from,
                    name: profileName || (customer ? customer.name : ''),
                    lastInteraction: new Date()
                });
            } catch (e) {
                console.error('Customer tracking error:', e.message);
            }

            let text = '';

            // =========================
            // TEXT MESSAGE
            // =========================

            if (
                message.type === 'text'
            ) {

                text =
                    message.text?.body
                        ?.toLowerCase()
                        .trim() || '';
            }

            // =========================
            // INTERACTIVE MESSAGE
            // =========================

            else if (
                message.type === 'interactive'
            ) {

                // BUTTON CLICK

                if (
                    message.interactive
                        ?.button_reply
                ) {

                    text =
                        message.interactive
                            .button_reply.id;
                }

                // LIST CLICK

                else if (
                    message.interactive
                        ?.list_reply
                ) {

                    text =
                        message.interactive
                            .list_reply.id;
                }
            }

            // =========================
            // LOCATION MESSAGE
            // =========================

            else if (
                message.type === 'location'
            ) {

                const loc =
                    message.location;

                text =
                    `[LOCATION] https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
            }

            console.log('FROM:', from);
            console.log('TEXT:', text);

            // =========================
            // HOME MENU
            // =========================

            if (
                text === 'hi' ||
                text === 'hello' ||
                text === 'menu'
            ) {
                sessions[from] = {
                    state: 'HOME',
                    branchId: customer?.branchId || null
                };

                const welcomeMsg = customer?.name 
                    ? `Welcome back, ${customer.name}! 😊` 
                    : 'Welcome to WStore 🛍️';

                const buttons = [
                    { id: 'shop', title: 'Shop' },
                    { id: 'cart', title: 'Cart' },
                    { id: 'track', title: 'Track Order' }
                ];

                await sendButtonMessage(from, welcomeMsg, buttons);
            }

            // =========================
            // TRACKING COMMAND
            // =========================

            else if (
                text === 'track' || 
                text === 'status'
            ) {
                if (!latestOrder) {
                    return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️", [{id: 'shop', title: 'Shop Now'}]);
                }

                const statusEmoji = {
                    'pending': '⏳',
                    'shipped': '🚚',
                    'delivered': '✅'
                }[latestOrder.status] || '📦';

                await sendButtonMessage(
                    from,
                    `📑 *Latest Order Status*
Order #${latestOrder.id}
Status: ${latestOrder.status.toUpperCase()} ${statusEmoji}
Total: ₹${latestOrder.total}
Placed on: ${new Date(latestOrder.createdAt).toLocaleDateString()}`,
                    [
                        { id: 'menu', title: 'Back to Menu' },
                        { id: 'shop', title: 'Shop More' }
                    ]
                );
            }

            // =========================
            // SHOP
            // =========================

            else if (
                text === 'shop'
            ) {
                // If already in a category, return to that category's products
                if (sessions[from]?.categoryId) {
                    const category = await Category.findByPk(sessions[from].categoryId);
                    if (category) {
                        const catProducts = await Product.findAll({
                            where: { categoryId: category.id, branchId: sessions[from].branchId },
                            order: [['name', 'ASC']]
                        });
                        return await sendListMessage(
                            from,
                            `🛍️ ${category.name} Collection`,
                            'View Products',
                            [{
                                title: category.name,
                                rows: catProducts.map(p => ({
                                    id: `product_${p.id}`,
                                    title: p.name.slice(0, 24),
                                    description: `₹${p.price}`
                                }))
                            }]
                        );
                    }
                }

                // If branch is already in session, skip re-selection and show categories
                if (sessions[from]?.branchId) {
                    const categories = await Category.findAll({
                        where: { branchId: sessions[from].branchId },
                        order: [['name', 'ASC']]
                    });
                    return await sendListMessage(
                        from,
                        '📂 Browse Categories',
                        'View Categories',
                        [{
                            title: 'Categories',
                            rows: categories.map(c => ({
                                id: `category_${c.id}`,
                                title: c.name.slice(0, 24),
                                description: c.description || 'View products'
                            }))
                        }]
                    );
                }

                // Persistent Branch Memory from Database
                if (customer?.branchId) {
                    const branch = await Branch.findByPk(customer.branchId);
                    if (branch) {
                        return await sendButtonMessage(
                            from, 
                            `Continue with *${branch.name}* or choose another? 📍`,
                            [
                                { id: `branch_${branch.id}`, title: `Use ${branch.name}` },
                                { id: 'change_branch', title: 'Change Hub' }
                            ]
                        );
                    }
                }

                sessions[from] = {
                    ...sessions[from],
                    state: 'SELECTING_BRANCH'
                };

                const branches = await Branch.findAll({ order: [['name', 'ASC']] });
                await sendListMessage(
                    from,
                    '📍 Choose your nearest branch',
                    'View Branches',
                    [
                        {
                            title: 'Branches',
                            rows: branches.map(branch => ({
                                id: `branch_${branch.id}`,
                                title: branch.name.slice(0, 24),
                                description: branch.address || 'Select branch'
                            }))
                        }
                    ]
                );
            }

            else if (
                text === 'change_branch'
            ) {
                sessions[from] = { ...sessions[from], state: 'SELECTING_BRANCH' };
                const branches = await Branch.findAll({ order: [['name', 'ASC']] });
                await sendListMessage(
                    from,
                    '📍 Choose your nearest branch',
                    'View Branches',
                    [
                        {
                            title: 'Branches',
                            rows: branches.map(branch => ({
                                id: `branch_${branch.id}`,
                                title: branch.name.slice(0, 24),
                                description: branch.address || 'Select branch'
                            }))
                        }
                    ]
                );
            }
            
            // =========================
            // BRANCH SELECTION
            // =========================

            else if (
                text.startsWith('branch_')
            ) {

                const branchId =
                    text.replace(
                        'branch_',
                        ''
                    );

                const branch =
                    await Branch.findByPk(
                        branchId
                    );

                if (branch) {
                    sessions[from] = {
                        state: 'SELECTING_CATEGORY',
                        branchId: branch.id
                    };

                    // Update Customer's branch affinity so they show up in this branch's dashboard
                    try {
                        await Customer.update({ branchId: branch.id }, { where: { phone: from } });
                    } catch (e) {
                        console.error("Failed to update customer branch:", e.message);
                    }

                    const categories =
                        await Category.findAll({
                            where: {
                                branchId: branch.id
                            },
                            order: [['name', 'ASC']]
                        });

                    // =========================
                    // CATEGORY BOTTOM SHEET
                    // =========================

                    await sendListMessage(
                        from,
                        `Welcome to ${branch.name}! 👋

Choose a category below`,
                        'View Categories',
                        [
                            {
                                title: '📂 Categories',

                                rows:
                                    categories.map(category => ({

                                        id:
                                            `category_${category.id}`,

                                        title:
                                            category.name
                                                .slice(0, 24),

                                        description:
                                            category.description ||
                                            'Browse products'
                                    }))
                            }
                        ]
                    );
                }
            }

            // =========================
            // CATEGORY SELECTION
            // =========================

            else if (
                text.startsWith('category_')
            ) {

                const categoryId =
                    text.replace(
                        'category_',
                        ''
                    );

                const category =
                    await Category.findByPk(
                        categoryId
                    );

                if (category) {

                    sessions[from] = {
                        ...sessions[from],
                        state: 'SELECTING_PRODUCT',
                        categoryId: category.id
                    };

                    const catProducts =
                        await Product.findAll({
                            where: {
                                categoryId: category.id,
                                branchId:
                                    sessions[from]
                                        .branchId
                            },
                            order: [['name', 'ASC']]
                        });

                    // =========================
                    // PRODUCT BOTTOM SHEET
                    // =========================

                    await sendListMessage(
                        from,
                        `🛍️ ${category.name}

Choose a product below`,
                        'View Products',
                        [
                            {
                                title:
                                    `${category.name} Collection`,

                                rows:
                                    catProducts.map(product => ({

                                        id:
                                            `product_${product.id}`,

                                        title:
                                            product.name
                                                .slice(0, 24),

                                        description:
                                            `₹${product.price}`
                                    }))
                            }
                        ]
                    );
                }

                else {

                    await sendTextMessage(
                        from,
                        'Invalid category ❌'
                    );
                }
            }

            // =========================
            // PRODUCT SELECTION
            // =========================

            else if (
                text.startsWith('product_')
            ) {

                const productId =
                    text.replace(
                        'product_',
                        ''
                    );

                const selectedProduct =
                    await Product.findByPk(
                        productId
                    );

                if (selectedProduct) {
                    sessions[from] = {
                        ...sessions[from],
                        state: 'VIEWING_PRODUCT',
                        productId: selectedProduct.id
                    };

                    await sendProductCardMessage(
                        from,
                        selectedProduct
                    );
                }

                else {

                    await sendTextMessage(
                        from,
                        'Invalid product ❌'
                    );
                }
            }

            // =========================
            // ADD TO CART
            // =========================

            else if (
                text.startsWith('add_') || 
                text.startsWith('buy_')
            ) {
                const type = text.startsWith('add_') ? 'add' : 'buy';
                const productId = text.replace('add_', '').replace('buy_', '');
                const product = await Product.findByPk(productId);

                if (product) {
                    sessions[from] = {
                        ...sessions[from],
                        state: 'COLLECTING_QUANTITY',
                        pendingAction: type,
                        pendingProductId: product.id
                    };

                    await sendTextMessage(from, `🔢 How many *${product.name}* would you like? (Please enter a number)`);
                }
            }

            // =========================
            // QUANTITY SELECTION (Handle Number)
            // =========================

            else if (
                sessions[from]?.state === 'COLLECTING_QUANTITY'
            ) {
                if (!isNaN(text)) {
                    const qty = parseInt(text);
                    if (qty <= 0) return await sendTextMessage(from, "Please enter a valid quantity (1 or more).");
                    
                    const productId = sessions[from].pendingProductId;
                    const action = sessions[from].pendingAction;
                    const product = await Product.findByPk(productId);

                    if (product) {
                        if (action === 'add') {
                            if (!carts[from]) carts[from] = [];
                            const existing = carts[from].find(it => it.id === product.id);
                            if (existing) existing.quantity += qty;
                            else carts[from].push({ id: product.id, name: product.name, price: product.price, quantity: qty });

                            sessions[from] = { ...sessions[from], state: 'SELECTING_PRODUCT' };

                            await sendButtonMessage(from, `✅ Added ${qty}x *${product.name}* to cart`, [
                                { id: 'shop', title: 'Shop More' },
                                { id: 'cart', title: 'View Cart' },
                                { id: 'checkout', title: 'Checkout' }
                            ]);
                        } else {
                            carts[from] = [{ id: product.id, name: product.name, price: product.price, quantity: qty }];
                            sessions[from] = { ...sessions[from], state: 'CHECKOUT_ADDRESS' };
                            await sendTextMessage(from, `📍 Enter delivery address for ${qty}x ${product.name}`);
                        }
                    }
                } else {
                    await sendTextMessage(from, "❌ Invalid quantity. Please enter a number (e.g., 1, 2, 5).");
                }
            }

            // Direct purchase block removed as it is now handled by COLLECTING_QUANTITY flow above

            // =========================
            // VIEW CART
            // =========================

            else if (
                text === 'cart'
            ) {

                const userCart =
                    carts[from] || [];

                if (
                    userCart.length === 0
                ) {

                    await sendButtonMessage(
                        from,
                        '🛒 Your cart is empty',
                        [
                            {
                                id: 'shop',
                                title: 'Shop'
                            }
                        ]
                    );
                }

                else {

                    let total = 0;

                    const cartText =
                        userCart
                            .map(item => {

                                total +=
                                    item.price *
                                    item.quantity;

                                return `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`;
                            })
                            .join('\n');

                    await sendButtonMessage(
                        from,
                        `🛒 Your Cart

${cartText}

💰 Total: ₹${total}`,
                        [
                            {
                                id: 'shop',
                                title: 'Shop More'
                            },
                            {
                                id: 'checkout',
                                title: 'Checkout'
                            }
                        ]
                    );
                }
            }

            // =========================
            // CHECKOUT
            // =========================

            else if (
                text === 'checkout'
            ) {

                const userCart =
                    carts[from] || [];

                if (
                    userCart.length === 0
                ) {

                    await sendButtonMessage(
                        from,
                        '🛒 Cart is empty',
                        [
                            {
                                id: 'shop',
                                title: 'Shop'
                            }
                        ]
                    );
                }

                else {

                    sessions[from] = {
                        ...sessions[from],
                        state:
                            'CHECKOUT_ADDRESS'
                    };

                    await sendTextMessage(
                        from,
                        '📍 Please enter your delivery address'
                    );
                }
            }

            // =========================
            // ADDRESS COLLECTION
            // =========================

            else if (
                sessions[from]?.state ===
                'CHECKOUT_ADDRESS'
            ) {

                const address = text;

                const userCart =
                    carts[from] || [];

                let total = 0;

                userCart.forEach(item => {

                    total +=
                        item.price *
                        item.quantity;
                });

                let savedOrder;

                try {

                    savedOrder =
                        await Order.create({

                            customerPhone:
                                from,

                            address,

                            items:
                                userCart,

                            total,

                            status:
                                'pending',

                            branchId:
                                sessions[from]
                                    ?.branchId
                        });

                } catch (e) {

                    console.error(
                        'Order save error:',
                        e
                    );
                }

                // =========================
                // DEDUCT STOCK
                // =========================

                if (savedOrder) {

                    for (const item of userCart) {

                        try {

                            await Product.decrement(
                                'stock',
                                {
                                    by:
                                        item.quantity,

                                    where: {
                                        id:
                                            item.id
                                    }
                                }
                            );

                        } catch (e) {

                            console.error(
                                `Stock deduction error for ${item.name}:`,
                                e.message
                            );
                        }
                    }
                }

                carts[from] = [];

                sessions[from] = {
                    state:
                        'ORDER_CONFIRMED'
                };

                await sendButtonMessage(
                    from,
                    `🎉 Order #${savedOrder ? savedOrder.id : ''} placed successfully!

📍 Address:
${address}

💰 Total:
₹${total}

🚚 Delivery will start soon.`,
                    [
                        {
                            id: 'shop',
                            title: 'Shop Again'
                        }
                    ]
                );
            }

            else {
                await sendButtonMessage(
                    from,
                    'Choose an option 👇',
                    [
                        { id: 'shop', title: 'Shop' },
                        { id: 'cart', title: 'Cart' },
                        { id: 'track', title: 'Track Order' }
                    ]
                );
            }
        }

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            error.response?.data ||
            error.message
        );

        return res.sendStatus(500);
    }
};

module.exports = {
    verifyWebhook,
    receiveWebhook
};