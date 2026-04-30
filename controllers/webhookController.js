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
    Branch,
    Tenant
} = require('../models');

const { Op } = require('sequelize');

// sessions structure: { [phoneNumber]: { state: 'HOME', tenantId: 1, branchId: 1, config: { ... } } }
const sessions = {};

const carts = {};

const verifyWebhook = (req, res) => {
    // ... (unchanged)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
        mode &&
        token === process.env.VERIFY_TOKEN
    ) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

const receiveWebhook = async (req, res) => {
    // Respond 200 OK immediately to Meta to prevent retries while we process the message
    res.sendStatus(200);
    
    try {
        console.log('[Webhook] Raw Request Body:', JSON.stringify(req.body, null, 2));
        
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const metadata = change?.value?.metadata;
        const message = change?.value?.messages?.[0];

        if (message && metadata) {
            const from = message.from;
            const phoneNumberId = metadata.phone_number_id;
            const profileName = change?.value?.contacts?.[0]?.profile?.name || '';
            console.log(`[Webhook] Incoming from ID: ${phoneNumberId}`);

            const tenant = await Tenant.findOne({ where: { phoneNumberId, isActive: true } });
            if (!tenant) {
                console.error(`[Webhook] No active tenant found for ID: ${phoneNumberId}`);
                // Try to send a fallback message using .env credentials
                try {
                    await sendTextMessage(from, "⚠️ This WhatsApp number is not yet fully configured on our platform. Please contact support. 🛍️", {
                        phoneNumberId: phoneNumberId, // Use the incoming ID
                        whatsappToken: process.env.WHATSAPP_TOKEN // Fallback to global token
                    });
                } catch (e) {
                    console.error("Failed to send fallback error message:", e.message);
                }
                return res.sendStatus(200);
            }

            const tenantConfig = {
                phoneNumberId: tenant.phoneNumberId,
                whatsappToken: tenant.whatsappToken
            };

            const tenantBranchIds = (await Branch.findAll({ where: { tenantId: tenant.id }, attributes: ['id'] })).map(b => b.id);
            const customer = await Customer.findOne({ 
                where: { 
                    phone: from, 
                    branchId: { [Op.or]: [{ [Op.in]: tenantBranchIds }, { [Op.eq]: null }] }
                } 
            });

            const latestOrder = await Order.findOne({ 
                where: { customerPhone: from }, 
                order: [['createdAt', 'DESC']] 
            });

            // Initialize or recover session
            if (!sessions[from]) {
                sessions[from] = { 
                    state: 'START',
                    tenantId: tenant.id,
                    branchId: customer?.branchId || null, // Auto-recover branch from database
                    config: tenantConfig 
                };
            } else {
                // Ensure tenant and branch context are always preserved
                sessions[from].tenantId = tenant.id;
                sessions[from].config = tenantConfig;
                if (!sessions[from].branchId && customer?.branchId) {
                    sessions[from].branchId = customer.branchId;
                }
            }

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

            if (text === 'hi' || text === 'hello' || text === 'start' || text === 'menu') {
                console.log(`[Flow] Entering 'hi/menu' block for ${from}`);
                sessions[from] = { ...sessions[from], state: 'START' };
                
                const welcomeMsg = customer?.name 
                    ? `Welcome back to *${tenant.name}*, ${customer.name}! 😊 We're so happy to see you again. Explore our latest collection and let us know if you need any help! 🛍️`
                    : `Welcome to *${tenant.name}*! 🛍️ We're excited to help you find precisely what you're looking for today. Feel free to browse our catalogs and reach out if you have any questions! ✨`;

                const buttons = [
                    { id: 'shop', title: 'Shop' },
                    { id: 'cart', title: 'Cart' },
                    { id: 'track', title: 'Track Order' }
                ];

                await sendButtonMessage(from, welcomeMsg, buttons, sessions[from].config);
            }

            // =========================
            // TRACKING COMMAND
            // =========================

            else if (
                text === 'track' || 
                text === 'status'
            ) {
                if (!latestOrder) {
                    return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️", [{id: 'shop', title: 'Shop Now'}], sessions[from].config);
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
                    ],
                    sessions[from].config
                );
            }

            // =========================
            // SHOP
            // =========================

            else if (text === 'shop') {
                console.log(`[Shop] Flow started for ${from}`);

                // If already in a category, return to that category's products
                if (sessions[from]?.categoryId) {
                    console.log(`[Shop] Category found in session: ${sessions[from].categoryId}`);
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
                            }],
                            sessions[from].config
                        );
                    }
                }

                // If branch is already in session, skip re-selection and show categories
                if (sessions[from]?.branchId) {
                    console.log(`[Shop] Branch found in session: ${sessions[from].branchId}`);
                    const categories = await Category.findAll({
                        where: { branchId: sessions[from].branchId },
                        order: [['name', 'ASC']]
                    });
                    if (categories.length === 0) {
                        console.log('[Shop] No categories found for session branch');
                        return await sendButtonMessage(from, "We haven't added any categories to this branch yet. Please check back later! 🛍️", [{ id: 'menu', title: 'Back to Menu' }], sessions[from].config);
                    }
                    return await sendListMessage(
                        from,
                        '📂 Browse Categories',
                        'Categories',
                        [{
                            title: '📂 Categories',
                            rows: categories.map(c => ({
                                id: `category_${c.id}`,
                                title: c.name.slice(0, 24),
                                description: c.description || 'Browse products'
                            }))
                        }],
                        sessions[from].config
                    );
                }

                // Persistent Branch Memory from Database
                if (customer?.branchId) {
                    console.log(`[Shop] Branch found in customer record: ${customer.branchId}`);
                    const branch = await Branch.findByPk(customer.branchId);
                    if (branch) {
                        return await sendButtonMessage(
                            from, 
                            `Continue with *${branch.name}* or choose another? 📍`,
                            [
                                { id: `branch_${branch.id}`, title: 'Continue' },
                                { id: 'change_branch', title: 'Change Hub' }
                            ],
                            sessions[from].config
                        );
                    }
                }

                const branches = await Branch.findAll({ 
                    where: { tenantId: tenant.id },
                    order: [['name', 'ASC']] 
                });

                if (branches.length === 0) {
                    return await sendButtonMessage(from, `This store (${tenant.name}) doesn't have any branches set up yet. Please check back later! 🛍️`, [{ id: 'menu', title: 'Back to Menu' }], sessions[from].config);
                }

                if (branches.length === 1) {
                    // Auto-select the only branch
                    const branch = branches[0];
                    sessions[from] = {
                        ...sessions[from],
                        state: 'SELECTING_CATEGORY',
                        branchId: branch.id
                    };
                    const categories = await Category.findAll({
                        where: { branchId: branch.id },
                        order: [['name', 'ASC']]
                    });

                    if (categories.length === 0) {
                        return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, sessions[from].config);
                    }
                    return await sendListMessage(
                        from,
                        `Welcome to ${branch.name}! 👋\n\nChoose a category below`,
                        'View Categories',
                        [{
                            title: '📂 Categories',
                            rows: categories.map(c => ({
                                id: `category_${c.id}`,
                                title: c.name.slice(0, 24),
                                description: c.description || 'Browse products'
                            }))
                        }],
                        sessions[from].config
                    );
                }

                sessions[from] = {
                    ...sessions[from],
                    state: 'SELECTING_BRANCH'
                };

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
                    ],
                    sessions[from].config
                );
            }

            else if (
                text === 'change_branch'
            ) {
                sessions[from] = { ...sessions[from], state: 'SELECTING_BRANCH' };
                const branches = await Branch.findAll({ 
                    where: { tenantId: sessions[from].tenantId },
                    order: [['name', 'ASC']] 
                });
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
                    ],
                    sessions[from].config
                );
            }
            
            // =========================
            // BRANCH SELECTION
            // =========================

            else if (
                text.startsWith('branch_')
            ) {
                console.log(`[Flow] Entering 'branch_' block for ${from}: ${text}`);

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
                        ...sessions[from],
                        state: 'SELECTING_CATEGORY',
                        branchId: branch.id
                    };

                    // Update Customer's branch affinity so they show up in this branch's dashboard
                    try {
                        await Customer.update({ branchId: branch.id }, { where: { phone: from } });
                    } catch (e) {
                        console.error("Failed to update customer branch:", e.message);
                    }

                    const categories = await Category.findAll({
                        where: { branchId: branch.id },
                        order: [['name', 'ASC']]
                    });

                    if (categories.length === 0) {
                        return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, sessions[from].config);
                    }

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
                                rows: categories.map(category => ({
                                    id: `category_${category.id}`,
                                    title: category.name.slice(0, 24),
                                    description: category.description || 'Browse products'
                                }))
                            }
                        ],
                        sessions[from].config
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
                    // Restore branchId if session was lost (e.g. server restart)
                    const branchId = sessions[from].branchId || category.branchId;
                    
                    sessions[from] = {
                        ...sessions[from],
                        state: 'SELECTING_PRODUCT',
                        categoryId: category.id,
                        branchId: branchId
                    };

                    const catProducts = await Product.findAll({
                        where: {
                            categoryId: category.id,
                            branchId: branchId
                        },
                        order: [['name', 'ASC']]
                    });

                    if (catProducts.length === 0) {
                        return await sendButtonMessage(from, `The *${category.name}* category is currently empty. Check back soon! 🛍️`, [{ id: 'shop', title: 'Choose Category' }, { id: 'menu', title: 'Main Menu' }], sessions[from].config);
                    }

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
                                title: `${category.name} Collection`,
                                rows: catProducts.map(product => ({
                                    id: `product_${product.id}`,
                                    title: product.name.slice(0, 24),
                                    description: `₹${product.price}`
                                }))
                            }
                        ],
                        sessions[from].config
                    );
                }

                else {

                    await sendTextMessage(
                        from,
                        'Invalid category ❌',
                        sessions[from].config
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
                        selectedProduct,
                        sessions[from].config
                    );
                }

                else {

                    await sendTextMessage(
                        from,
                        'Invalid product ❌',
                        sessions[from].config
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
                console.log(`[Flow] Entering 'add_'/'buy_' block for ${from}: ${text}`);
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

                    await sendTextMessage(from, `🔢 How many *${product.name}* would you like? (Please enter a number)`, sessions[from].config);
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
                    if (qty <= 0) return await sendTextMessage(from, "Please enter a valid quantity (1 or more).", sessions[from].config);
                    
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
                            ], sessions[from].config);
                        } else {
                            carts[from] = [{ id: product.id, name: product.name, price: product.price, quantity: qty }];
                            sessions[from] = { ...sessions[from], state: 'CHECKOUT_ADDRESS' };
                            await sendTextMessage(from, `📍 Enter delivery address for ${qty}x ${product.name}`, sessions[from].config);
                        }
                    }
                } else {
                    await sendTextMessage(from, "❌ Invalid quantity. Please enter a number (e.g., 1, 2, 5).", sessions[from].config);
                }
            }

            // Direct purchase block removed as it is now handled by COLLECTING_QUANTITY flow above

            // =========================
            // VIEW CART
            // =========================

            else if (text === 'cart') {
                console.log(`[Flow] Entering 'cart' block for ${from}`);

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
                        ],
                        sessions[from].config
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
                        ],
                        sessions[from].config
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
                        ],
                        sessions[from].config
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
                        '📍 Please enter your delivery address',
                        sessions[from].config
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
                    ...sessions[from],
                    state: 'ORDER_CONFIRMED'
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
                    ],
                    sessions[from].config
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
                    ],
                    sessions[from].config
                );
            }
        }

        return;

    } catch (error) {

        console.error(
            error.response?.data ||
            error.message
        );

        return;
    }
};

module.exports = {
    verifyWebhook,
    receiveWebhook
};