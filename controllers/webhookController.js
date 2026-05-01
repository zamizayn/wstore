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
                    config: tenantConfig,
                    lastInteraction: new Date()
                };
            } else {
                // Ensure tenant and branch context are always preserved
                sessions[from].tenantId = tenant.id;
                sessions[from].config = tenantConfig;
                sessions[from].lastInteraction = new Date();
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

                await sendListMessage(from, welcomeMsg, "Main Menu", [
                    {
                        title: "🛒 Shopping",
                        rows: [
                            { id: 'shop', title: 'Browse Store', description: 'View categories & products' },
                            { id: 'search_mode', title: 'Search Products', description: 'Find something specific 🔍' }
                        ]
                    },
                    {
                        title: "📋 Account",
                        rows: [
                            { id: 'cart', title: 'View Cart', description: 'Check your items 🛒' },
                            { id: 'track', title: 'Track Order', description: 'Check status 🚚' }
                        ]
                    }
                ], sessions[from].config);
            }

            // =========================
            // TRACKING COMMAND
            // =========================

            else if (
                text === 'track' ||
                text === 'status'
            ) {
                if (!latestOrder) {
                    return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️", [{ id: 'shop', title: 'Shop Now' }], sessions[from].config);
                }

                const statusEmoji = {
                    'pending': '⏳',
                    'shipped': '🚚',
                    'delivered': '✅'
                }[latestOrder.status] || '📦';

                const trackingText = `📑 *Order Status*
Order #${latestOrder.id}
Status: ${latestOrder.status.toUpperCase()} ${statusEmoji}
Total: ₹${latestOrder.total}
Placed on: ${new Date(latestOrder.createdAt).toLocaleDateString()}`;

                const buttons = [
                    { id: 'menu', title: 'Back to Menu' }
                ];

                if (latestOrder.status === 'delivered') {
                    buttons.push({ id: `rate_${latestOrder.id}`, title: 'Rate Order ⭐' });
                } else {
                    buttons.push({ id: 'shop', title: 'Shop More' });
                }

                await sendButtonMessage(from, trackingText, buttons, sessions[from].config);
            }

            // =========================
            // SEARCH MODE
            // =========================

            else if (text === 'search_mode') {
                sessions[from].state = 'SEARCHING';
                await sendTextMessage(from, "🔍 *Product Search*\n\nType the name of the product you are looking for:", sessions[from].config);
            }

            else if (sessions[from]?.state === 'SEARCHING') {
                if (text === 'menu' || text === 'shop') {
                    // Handled by other blocks, but let's reset state
                    sessions[from].state = 'START';
                } else {
                    const searchResults = await Product.findAll({
                        where: {
                            [Op.or]: [
                                { name: { [Op.iLike]: `%${text}%` } },
                                { description: { [Op.iLike]: `%${text}%` } }
                            ],
                            branchId: sessions[from].branchId || { [Op.not]: null }
                        },
                        limit: 10
                    });

                    if (searchResults.length === 0) {
                        return await sendButtonMessage(from, `❌ No products found matching "*${text}*". Try another name or browse our categories.`, [{ id: 'search_mode', title: 'Search Again' }, { id: 'shop', title: 'Browse Store' }], sessions[from].config);
                    }

                    await sendListMessage(
                        from,
                        `🔍 Found ${searchResults.length} matches for "*${text}*":`,
                        'Select Product',
                        [{
                            title: 'Search Results',
                            rows: searchResults.map(p => ({
                                id: `product_${p.id}`,
                                title: p.name.slice(0, 24),
                                description: `₹${p.price}`
                            }))
                        }],
                        sessions[from].config
                    );
                    sessions[from].state = 'START'; // Reset after search results shown
                    return;
                }
            }

            // =========================
            // RATING / FEEDBACK
            // =========================

            else if (text.startsWith('rate_')) {
                const orderId = text.replace('rate_', '');
                sessions[from].state = 'COLLECTING_FEEDBACK';
                sessions[from].pendingOrderId = orderId;
                await sendButtonMessage(from, "How was your experience with this order? ⭐", [
                    { id: 'star_5', title: 'Excellent ⭐⭐⭐⭐⭐' },
                    { id: 'star_4', title: 'Good ⭐⭐⭐⭐' },
                    { id: 'star_3', title: 'Average ⭐⭐⭐' }
                ], sessions[from].config);
            }

            else if (sessions[from]?.state === 'COLLECTING_FEEDBACK' && text.startsWith('star_')) {
                const rating = text.replace('star_', '');
                await sendTextMessage(from, `Thank you for your ${rating}-star rating! 🙏 Your feedback helps us improve.`, sessions[from].config);
                sessions[from].state = 'START';
                // Note: We could save this to the DB if we add rating fields to Order model
            }

            // =========================
            // SHOP
            // =========================

            else if (text === 'shop' || text === 'change_category') {
                console.log(`[Shop] Flow started for ${from}`);

                if (text === 'change_category') {
                    sessions[from].categoryId = null;
                }

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

                // Removed the automatic bypass to ensure the bot asks for store selection/confirmation


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
                        branchId: branchId,
                        page: 1,
                        sort: 'name_ASC'
                    };

                    const page = sessions[from].page || 1;
                    const limit = 10;
                    const sort = sessions[from].sort || 'name_ASC';
                    const orderAttr = sort === 'price_low' ? [['price', 'ASC']] : sort === 'price_high' ? [['price', 'DESC']] : [['name', 'ASC']];

                    const { count, rows: catProducts } = await Product.findAndCountAll({
                        where: {
                            categoryId: category.id,
                            branchId: branchId
                        },
                        order: orderAttr,
                        limit: limit,
                        offset: (page - 1) * limit
                    });

                    if (catProducts.length === 0) {
                        return await sendButtonMessage(from, `The *${category.name}* category is currently empty. Check back soon! 🛍️`, [{ id: 'change_category', title: 'Choose Category' }, { id: 'menu', title: 'Main Menu' }], sessions[from].config);
                    }

                    const sections = [];

                    // Best Sellers Section (First 3 products on page 1)
                    if (page === 1 && catProducts.length > 3) {
                        sections.push({
                            title: '🔥 Best Sellers',
                            rows: catProducts.slice(0, 3).map(product => ({
                                id: `product_${product.id}`,
                                title: `✨ ${product.name.slice(0, 20)}`,
                                description: `₹${product.price} - Popular`
                            }))
                        });
                    }

                    // Main Collection
                    sections.push({
                        title: `${category.name} Collection`,
                        rows: catProducts.map(product => ({
                            id: `product_${product.id}`,
                            title: product.name.slice(0, 24),
                            description: `₹${product.price}`
                        }))
                    });

                    // Options Section (Pagination & Sorting)
                    const optionRows = [];
                    if (count > page * limit) {
                        optionRows.push({ id: `next_page_${category.id}`, title: 'Next Page ➡️', description: `View more in ${category.name}` });
                    }
                    if (page > 1) {
                        optionRows.push({ id: `prev_page_${category.id}`, title: '⬅️ Previous Page', description: 'Go back' });
                    }
                    
                    optionRows.push({ id: `sort_toggle_${category.id}`, title: '🔃 Sort By Price', description: `Current: ${sort.replace('_', ' ')}` });
                    optionRows.push({ id: 'change_category', title: '📂 Change Category', description: 'View other categories' });

                    sections.push({
                        title: '⚙️ Options',
                        rows: optionRows
                    });

                    await sendListMessage(
                        from,
                        `🛍️ *${category.name}* (Page ${page})
                        
Choose a product below`,
                        'View Products',
                        sections,
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
            // PAGINATION & SORTING HANDLERS
            // =========================

            else if (text.startsWith('next_page_')) {
                sessions[from].page = (sessions[from].page || 1) + 1;
                // Re-trigger category selection logic
                text = `category_${text.replace('next_page_', '')}`;
            }

            else if (text.startsWith('prev_page_')) {
                sessions[from].page = Math.max(1, (sessions[from].page || 1) - 1);
                text = `category_${text.replace('prev_page_', '')}`;
            }

            else if (text.startsWith('sort_toggle_')) {
                const categoryId = text.replace('sort_toggle_', '');
                await sendButtonMessage(from, "🔃 *Sort Products*\n\nHow would you like to view items?", [
                    { id: `sort_low_${categoryId}`, title: 'Price: Low to High' },
                    { id: `sort_high_${categoryId}`, title: 'Price: High to Low' },
                    { id: `sort_name_${categoryId}`, title: 'Name: A-Z' }
                ], sessions[from].config);
            }

            else if (text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
                const categoryId = text.split('_').pop();
                sessions[from].sort = text.startsWith('sort_low') ? 'price_low' : text.startsWith('sort_high') ? 'price_high' : 'name_ASC';
                sessions[from].page = 1; // Reset to page 1 on sort
                text = `category_${categoryId}`;
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
                        const existingInCart = carts[from]?.find(it => it.id === product.id)?.quantity || 0;
                        const totalRequested = (action === 'add' ? existingInCart : 0) + qty;

                        if (product.stock !== null && product.stock <= 0) {
                            return await sendTextMessage(from, `❌ Sorry, *${product.name}* is currently out of stock.`, sessions[from].config);
                        }

                        if (product.stock !== null && totalRequested > product.stock) {
                            const availableToAdd = product.stock - (action === 'add' ? existingInCart : 0);
                            if (availableToAdd <= 0) {
                                return await sendTextMessage(from, `⚠️ You already have the maximum available stock (*${product.stock}*) of *${product.name}* in your cart.`, sessions[from].config);
                            } else {
                                return await sendTextMessage(from, `⚠️ Only *${product.stock}* units of *${product.name}* are available. ${action === 'add' && existingInCart > 0 ? `You already have *${existingInCart}* in your cart. ` : ''}Please enter a quantity of *${availableToAdd}* or less.`, sessions[from].config);
                            }
                        }

                        if (action === 'add') {
                            if (!carts[from]) carts[from] = [];
                            const existing = carts[from].find(it => it.id === product.id);
                            if (existing) existing.quantity += qty;
                            else carts[from].push({ id: product.id, name: product.name, price: product.price, quantity: qty });

                            sessions[from] = { ...sessions[from], state: 'SELECTING_PRODUCT', abandonedNotified: false };

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

// =========================
// ABANDONED CART MONITOR
// =========================

const checkAbandonedCarts = async () => {
    const now = new Date();
    const threshold = 1 * 60 * 60 * 1000; // 1 hour threshold (change to 1 minute for quick testing)

    for (const [phoneNumber, session] of Object.entries(sessions)) {
        const cart = carts[phoneNumber] || [];
        if (cart.length > 0 && session.lastInteraction) {
            const idleTime = now - new Date(session.lastInteraction);

            // If idle for more than threshold and not already notified for this specific session state
            if (idleTime > threshold && !session.abandonedNotified) {
                try {
                    console.log(`[Monitor] Sending abandoned cart reminder to ${phoneNumber}`);
                    await sendTextMessage(
                        phoneNumber,
                        "👋 Hey! We noticed you have items in your cart. Would you like to complete your order? 🛒",
                        session.config
                    );
                    session.abandonedNotified = true;
                } catch (e) {
                    console.error(`[Monitor] Failed to send reminder to ${phoneNumber}:`, e.message);
                }
            }
        }
    }
};

// Check every 10 minutes
setInterval(checkAbandonedCarts, 10 * 60 * 1000);

module.exports = {
    verifyWebhook,
    receiveWebhook
};