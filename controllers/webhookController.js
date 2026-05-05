const {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendProductCardMessage,
    sendSingleProductMessage,
    sendMultiProductMessage
} = require('../services/whatsappService');

const {
    Category,
    Product,
    Order,
    Customer,
    Branch,
    Tenant,
    CustomerLog
} = require('../models');

const { Op } = require('sequelize');

// sessions structure: { [phoneNumber]: { state: 'HOME', tenantId: 1, branchId: 1, config: { ... } } }
const sessions = {};
const carts = {};

const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === process.env.VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
};

// =========================
// Helper Functions
// =========================

const logCustomerActivity = async (phone, tenantId, branchId, actionType, details = {}) => {
    try {
        await CustomerLog.create({
            customerPhone: phone,
            tenantId,
            branchId,
            actionType,
            details
        });
    } catch (e) {
        console.error('Failed to log customer activity:', e.message);
    }
};

const extractTextFromMessage = (message) => {
    if (message.type === 'text') {
        return message.text?.body?.toLowerCase().trim() || '';
    } else if (message.type === 'interactive') {
        if (message.interactive?.button_reply) {
            return message.interactive.button_reply.id;
        } else if (message.interactive?.list_reply) {
            return message.interactive.list_reply.id;
        }
    } else if (message.type === 'location') {
        const loc = message.location;
        return `[LOCATION] https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
    } else if (message.type === 'order') {
        return 'native_order';
    }
    return '';
};

// =========================
// Handler Functions
// =========================

const handleHomeMenu = async (from, session, tenant, customer) => {
    session.state = 'START';

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
    ], session.config);
};

const handleTrackOrder = async (from, session, latestOrder) => {
    if (!latestOrder) {
        return await sendButtonMessage(from, "You haven't placed any orders yet. Start shopping! 🛍️", [{ id: 'shop', title: 'Shop Now' }], session.config);
    }

    const statusEmoji = {
        'pending': '⏳',
        'shipped': '🚚',
        'delivered': '✅'
    }[latestOrder.status] || '📦';

    const trackingText = `📑 *Order Status*\nOrder #${latestOrder.id}\nStatus: ${latestOrder.status.toUpperCase()} ${statusEmoji}\nTotal: ₹${latestOrder.total}\nPlaced on: ${new Date(latestOrder.createdAt).toLocaleDateString()}`;

    const buttons = [{ id: 'menu', title: 'Back to Menu' }];
    if (latestOrder.status === 'delivered') {
        buttons.push({ id: `rate_${latestOrder.id}`, title: 'Rate Order ⭐' });
    } else {
        buttons.push({ id: 'shop', title: 'Shop More' });
    }

    await sendButtonMessage(from, trackingText, buttons, session.config);
};

const handleSearchMode = async (from, session) => {
    session.state = 'SEARCHING';
    await sendTextMessage(from, "🔍 *Product Search*\n\nType the name of the product you are looking for:", session.config);
};

const handleSearching = async (from, text, session) => {
    if (text === 'menu' || text === 'shop') {
        session.state = 'START';
        return 'RE_ROUTE';
    }

    const searchResults = await Product.findAll({
        where: {
            [Op.or]: [
                { name: { [Op.iLike]: `%${text}%` } },
                { description: { [Op.iLike]: `%${text}%` } }
            ],
            branchId: session.branchId || { [Op.not]: null }
        },
        limit: 10
    });

    if (searchResults.length === 0) {
        return await sendButtonMessage(from, `❌ No products found matching "*${text}*". Try another name or browse our categories.`, [{ id: 'search_mode', title: 'Search Again' }, { id: 'shop', title: 'Browse Store' }], session.config);
    }

    if (session.catalogId) {
        const sections = [{
            title: 'Search Results',
            product_items: searchResults.map(p => ({ product_retailer_id: p.retailerId }))
        }];
        await sendMultiProductMessage(from, session.catalogId, `🔍 Found ${searchResults.length} matches for "*${text}*"`, 'Choose a product below', sections, session.config);
    } else {
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
            session.config
        );
    }

    session.state = 'START';
};

const handleRating = async (from, text, session) => {
    const orderId = text.replace('rate_', '');
    session.state = 'COLLECTING_FEEDBACK';
    session.pendingOrderId = orderId;
    await sendButtonMessage(from, "How was your experience with this order? ⭐", [
        { id: 'star_5', title: 'Excellent ⭐⭐⭐⭐⭐' },
        { id: 'star_4', title: 'Good ⭐⭐⭐⭐' },
        { id: 'star_3', title: 'Average ⭐⭐⭐' }
    ], session.config);
};

const handleCollectingFeedback = async (from, text, session) => {
    const rating = text.replace('star_', '');
    await sendTextMessage(from, `Thank you for your ${rating}-star rating! 🙏 Your feedback helps us improve.`, session.config);
    session.state = 'START';
};

const handleChangeBranch = async (from, session) => {
    session.state = 'SELECTING_BRANCH';
    const branches = await Branch.findAll({
        where: { tenantId: session.tenantId },
        order: [['name', 'ASC']]
    });
    await sendListMessage(
        from,
        '📍 Choose your nearest branch',
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(branch => ({
                id: `branch_${branch.id}`,
                title: branch.name.slice(0, 24),
                description: branch.address || 'Select branch'
            }))
        }],
        session.config
    );
};

const handleShop = async (from, text, session, tenant, customer) => {
    console.log(`[Shop] Flow started for ${from}`);

    if (text === 'change_category') {
        session.categoryId = null;
    }

    if (session.categoryId) {
        console.log(`[Shop] Category found in session: ${session.categoryId}`);
        const category = await Category.findByPk(session.categoryId);
        if (category) {
            const catProducts = await Product.findAll({
                where: { categoryId: category.id, branchId: session.branchId },
                order: [['name', 'ASC']]
            });

            if (session.catalogId) {
                const sections = [{
                    title: category.name.slice(0, 24),
                    product_items: catProducts.map(p => ({ product_retailer_id: p.retailerId }))
                }];
                return await sendMultiProductMessage(from, session.catalogId, `🛍️ ${category.name} Collection`, 'Choose a product below', sections, session.config);
            } else {
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
                    session.config
                );
            }
        }
    }

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
                session.config
            );
        }
    }

    const branches = await Branch.findAll({
        where: { tenantId: tenant.id },
        order: [['name', 'ASC']]
    });

    if (branches.length === 0) {
        return await sendButtonMessage(from, `This store (${tenant.name}) doesn't have any branches set up yet. Please check back later! 🛍️`, [{ id: 'menu', title: 'Back to Menu' }], session.config);
    }

    if (branches.length === 1) {
        const branch = branches[0];
        session.state = 'SELECTING_CATEGORY';
        session.branchId = branch.id;

        const categories = await Category.findAll({
            where: { branchId: branch.id },
            order: [['name', 'ASC']]
        });

        if (categories.length === 0) {
            return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, session.config);
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
            session.config
        );
    }

    session.state = 'SELECTING_BRANCH';
    await sendListMessage(
        from,
        '📍 Choose your nearest branch',
        'View Branches',
        [{
            title: 'Branches',
            rows: branches.map(branch => ({
                id: `branch_${branch.id}`,
                title: branch.name.slice(0, 24),
                description: branch.address || 'Select branch'
            }))
        }],
        session.config
    );
};

const handleBranchSelection = async (from, text, session) => {
    console.log(`[Flow] Entering 'branch_' block for ${from}: ${text}`);
    const branchId = text.replace('branch_', '');
    const branch = await Branch.findByPk(branchId);

    if (branch) {
        session.state = 'SELECTING_CATEGORY';
        session.branchId = branch.id;

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
            return await sendTextMessage(from, `Welcome to ${branch.name}! 👋\n\nWe haven't added any categories to this branch yet. Please check back later! 🛍️`, session.config);
        }

        await sendListMessage(
            from,
            `Welcome to ${branch.name}! 👋\n\nChoose a category below`,
            'View Categories',
            [{
                title: '📂 Categories',
                rows: categories.map(category => ({
                    id: `category_${category.id}`,
                    title: category.name.slice(0, 24),
                    description: category.description || 'Browse products'
                }))
            }],
            session.config
        );
    }
};

const handleCategorySelection = async (from, text, session) => {
    const categoryId = text.replace('category_', '');
    const category = await Category.findByPk(categoryId);

    if (category) {
        const branchId = session.branchId || category.branchId;

        session.state = 'SELECTING_PRODUCT';
        session.categoryId = category.id;
        session.branchId = branchId;
        if (!session.page) session.page = 1;
        if (!session.sort) session.sort = 'name_ASC';

        const page = session.page;
        const limit = 10;
        const sort = session.sort;
        const orderAttr = sort === 'price_low' ? [['price', 'ASC']] : sort === 'price_high' ? [['price', 'DESC']] : [['name', 'ASC']];

        const { count, rows: catProducts } = await Product.findAndCountAll({
            where: { categoryId: category.id, branchId: branchId },
            order: orderAttr,
            limit: limit,
            offset: (page - 1) * limit
        });

        if (catProducts.length === 0) {
            return await sendButtonMessage(from, `The *${category.name}* category is currently empty. Check back soon! 🛍️`, [{ id: 'change_category', title: 'Choose Category' }, { id: 'menu', title: 'Main Menu' }], session.config);
        }

        if (session.catalogId) {
            const sections = [];
            if (page === 1 && catProducts.length > 3) {
                sections.push({
                    title: '🔥 Best Sellers',
                    product_items: catProducts.slice(0, 3).map(p => ({ product_retailer_id: p.retailerId }))
                });
            }
            sections.push({
                title: `${category.name} Collection`.slice(0, 24),
                product_items: catProducts.map(p => ({ product_retailer_id: p.retailerId }))
            });

            await sendMultiProductMessage(from, session.catalogId, `🛍️ *${category.name}* (Page ${page})`, 'Choose a product below', sections, session.config);

            const optionRows = [];
            if (count > page * limit) {
                optionRows.push({ id: `next_page_${category.id}`, title: 'Next Page ➡️', description: `View more in ${category.name}` });
            }
            if (page > 1) {
                optionRows.push({ id: `prev_page_${category.id}`, title: '⬅️ Previous Page', description: 'Go back' });
            }

            optionRows.push({ id: `sort_toggle_${category.id}`, title: '🔃 Sort By Price', description: `Current: ${sort.replace('_', ' ')}` });
            optionRows.push({ id: 'change_category', title: '📂 Change Category', description: 'View other categories' });

            // Send pagination options as a separate list message since native cart limits buttons
            await sendListMessage(from, "More Options:", "Options", [{ title: "Options", rows: optionRows }], session.config);

        } else {
            const sections = [];

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

            sections.push({
                title: `${category.name} Collection`,
                rows: catProducts.map(product => ({
                    id: `product_${product.id}`,
                    title: product.name.slice(0, 24),
                    description: `₹${product.price}`
                }))
            });

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
                `🛍️ *${category.name}* (Page ${page})\n\nChoose a product below`,
                'View Products',
                sections,
                session.config
            );
        }
    } else {
        await sendTextMessage(from, 'Invalid category ❌', session.config);
    }
};

const handlePaginationAndSorting = async (from, text, session) => {
    if (text.startsWith('next_page_')) {
        session.page = (session.page || 1) + 1;
        return `category_${text.replace('next_page_', '')}`;
    } else if (text.startsWith('prev_page_')) {
        session.page = Math.max(1, (session.page || 1) - 1);
        return `category_${text.replace('prev_page_', '')}`;
    } else if (text.startsWith('sort_toggle_')) {
        const categoryId = text.replace('sort_toggle_', '');
        await sendButtonMessage(from, "🔃 *Sort Products*\n\nHow would you like to view items?", [
            { id: `sort_low_${categoryId}`, title: 'Price: Low to High' },
            { id: `sort_high_${categoryId}`, title: 'Price: High to Low' },
            { id: `sort_name_${categoryId}`, title: 'Name: A-Z' }
        ], session.config);
        return null;
    } else if (text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
        const categoryId = text.split('_').pop();
        session.sort = text.startsWith('sort_low') ? 'price_low' : text.startsWith('sort_high') ? 'price_high' : 'name_ASC';
        session.page = 1;
        return `category_${categoryId}`;
    }
    return null;
};

const handleProductSelection = async (from, text, session) => {
    const productId = text.replace('product_', '');
    const selectedProduct = await Product.findByPk(productId);

    if (selectedProduct) {
        session.state = 'VIEWING_PRODUCT';
        session.productId = selectedProduct.id;

        if (session.catalogId) {
            await sendSingleProductMessage(from, session.catalogId, selectedProduct.retailerId, `🔥 ${selectedProduct.name}`, 'WStore 🛍️', session.config);
        } else {
            await sendProductCardMessage(from, selectedProduct, session.config);
        }
    } else {
        await sendTextMessage(from, 'Invalid product ❌', session.config);
    }
};

const handleAddToCart = async (from, text, session) => {
    console.log(`[Flow] Entering 'add_'/'buy_' block for ${from}: ${text}`);
    const type = text.startsWith('add_') ? 'add' : 'buy';
    const productId = text.replace('add_', '').replace('buy_', '');
    const product = await Product.findByPk(productId);

    if (product) {
        session.state = 'COLLECTING_QUANTITY';
        session.pendingAction = type;
        session.pendingProductId = product.id;
        await sendTextMessage(from, `🔢 How many *${product.name}* would you like? (Please enter a number)`, session.config);
    }
};

const handleQuantitySelection = async (from, text, session) => {
    if (!isNaN(text)) {
        const qty = parseInt(text);
        if (qty <= 0) return await sendTextMessage(from, "Please enter a valid quantity (1 or more).", session.config);

        const productId = session.pendingProductId;
        const action = session.pendingAction;
        const product = await Product.findByPk(productId);

        if (product) {
            const existingInCart = carts[from]?.find(it => it.id === product.id)?.quantity || 0;
            const totalRequested = (action === 'add' ? existingInCart : 0) + qty;

            if (product.stock !== null && product.stock <= 0) {
                return await sendTextMessage(from, `❌ Sorry, *${product.name}* is currently out of stock.`, session.config);
            }

            if (product.stock !== null && totalRequested > product.stock) {
                const availableToAdd = product.stock - (action === 'add' ? existingInCart : 0);
                if (availableToAdd <= 0) {
                    return await sendTextMessage(from, `⚠️ You already have the maximum available stock (*${product.stock}*) of *${product.name}* in your cart.`, session.config);
                } else {
                    return await sendTextMessage(from, `⚠️ Only *${product.stock}* units of *${product.name}* are available. ${action === 'add' && existingInCart > 0 ? `You already have *${existingInCart}* in your cart. ` : ''}Please enter a quantity of *${availableToAdd}* or less.`, session.config);
                }
            }

            if (action === 'add') {
                if (!carts[from]) carts[from] = [];
                const existing = carts[from].find(it => it.id === product.id);
                if (existing) existing.quantity += qty;
                else carts[from].push({ id: product.id, name: product.name, price: product.price, quantity: qty });

                session.state = 'SELECTING_PRODUCT';
                session.abandonedNotified = false;

                await sendButtonMessage(from, `✅ Added ${qty}x *${product.name}* to cart`, [
                    { id: 'shop', title: 'Shop More' },
                    { id: 'cart', title: 'View Cart' },
                    { id: 'checkout', title: 'Checkout' }
                ], session.config);
            } else {
                carts[from] = [{ id: product.id, name: product.name, price: product.price, quantity: qty }];
                session.state = 'CHECKOUT_ADDRESS';
                await sendTextMessage(from, `📍 Enter delivery address for ${qty}x ${product.name}`, session.config);
            }
        }
    } else {
        await sendTextMessage(from, "❌ Invalid quantity. Please enter a number (e.g., 1, 2, 5).", session.config);
    }
};

const handleCart = async (from, session) => {
    console.log(`[Flow] Entering 'cart' block for ${from}`);
    const userCart = carts[from] || [];

    if (userCart.length === 0) {
        await sendButtonMessage(from, '🛒 Your cart is empty', [{ id: 'shop', title: 'Shop' }], session.config);
    } else {
        let total = 0;
        const cartText = userCart.map(item => {
            total += item.price * item.quantity;
            return `• ${item.name} x${item.quantity} - ₹${item.price * item.quantity}`;
        }).join('\n');

        await sendButtonMessage(
            from,
            `🛒 Your Cart\n\n${cartText}\n\n💰 Total: ₹${total}`,
            [
                { id: 'shop', title: 'Shop More' },
                { id: 'checkout', title: 'Checkout' }
            ],
            session.config
        );
    }
};

const handleCheckout = async (from, session) => {
    const userCart = carts[from] || [];
    if (userCart.length === 0) {
        await sendButtonMessage(from, '🛒 Cart is empty', [{ id: 'shop', title: 'Shop' }], session.config);
    } else {
        session.state = 'CHECKOUT_ADDRESS';
        await sendTextMessage(from, '📍 Please enter your delivery address', session.config);
    }
};

const handleAddressCollection = async (from, text, session) => {
    const address = text;
    const userCart = carts[from] || [];
    let total = 0;

    userCart.forEach(item => { total += item.price * item.quantity; });

    let savedOrder;
    try {
        savedOrder = await Order.create({
            customerPhone: from,
            address,
            items: userCart,
            total,
            status: 'pending',
            branchId: session.branchId
        });
    } catch (e) {
        console.error('Order save error:', e);
    }

    if (savedOrder) {
        for (const item of userCart) {
            try {
                await Product.decrement('stock', { by: item.quantity, where: { id: item.id } });
            } catch (e) {
                console.error(`Stock deduction error for ${item.name}:`, e.message);
            }
        }
    }

    carts[from] = [];
    session.state = 'ORDER_CONFIRMED';

    await sendButtonMessage(
        from,
        `🎉 Order #${savedOrder ? savedOrder.id : ''} placed successfully!\n\n📍 Address:\n${address}\n\n💰 Total:\n₹${total}\n\n🚚 Delivery will start soon.`,
        [{ id: 'shop', title: 'Shop Again' }],
        session.config
    );
};

const handleNativeOrder = async (from, message, session) => {
    const orderData = message.order;
    const productItems = orderData.product_items;

    if (!productItems || productItems.length === 0) return;

    // Convert native payload to our cart format
    const newCart = [];
    for (const item of productItems) {
        const product = await Product.findOne({ where: { retailerId: item.product_retailer_id, branchId: session.branchId || { [Op.not]: null } } });
        if (product) {
            newCart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(item.item_price),
                quantity: parseInt(item.quantity)
            });
        }
    }

    if (newCart.length > 0) {
        carts[from] = newCart;
        session.state = 'CHECKOUT_ADDRESS';
        await sendTextMessage(from, '📍 We received your cart! Please enter your delivery address to confirm the order:', session.config);
    } else {
        await sendTextMessage(from, '❌ There was an error processing your cart. Products may be out of stock or unavailable.', session.config);
    }
};

const handleDefault = async (from, session) => {
    await sendButtonMessage(
        from,
        'Choose an option 👇',
        [
            { id: 'shop', title: 'Shop' },
            { id: 'cart', title: 'Cart' },
            { id: 'track', title: 'Track Order' }
        ],
        session.config
    );
};

// =========================
// Main Webhook Controller
// =========================

const receiveWebhook = async (req, res) => {
    res.sendStatus(200);

    try {
        console.log('[Webhook] Raw Request Body:', JSON.stringify(req.body, null, 2));

        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const metadata = change?.value?.metadata;
        const message = change?.value?.messages?.[0];

        if (!message || !metadata) return;

        const from = message.from;
        const phoneNumberId = metadata.phone_number_id;
        const profileName = change?.value?.contacts?.[0]?.profile?.name || '';
        console.log(`[Webhook] Incoming from ID: ${phoneNumberId}`);

        const tenant = await Tenant.findOne({ where: { phoneNumberId, isActive: true } });
        if (!tenant) {
            console.error(`[Webhook] No active tenant found for ID: ${phoneNumberId}`);
            try {
                await sendTextMessage(from, "⚠️ This WhatsApp number is not yet fully configured on our platform. Please contact support. 🛍️", {
                    phoneNumberId: phoneNumberId,
                    whatsappToken: process.env.WHATSAPP_TOKEN
                });
            } catch (e) {
                console.error("Failed to send fallback error message:", e.message);
            }
            return;
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

        if (!sessions[from]) {
            sessions[from] = {
                state: 'START',
                tenantId: tenant.id,
                branchId: customer?.branchId || null,
                config: tenantConfig,
                catalogId: tenant.catalogId,
                lastInteraction: new Date()
            };
        } else {
            sessions[from].tenantId = tenant.id;
            sessions[from].config = tenantConfig;
            sessions[from].catalogId = tenant.catalogId;
            sessions[from].lastInteraction = new Date();
            if (!sessions[from].branchId && customer?.branchId) {
                sessions[from].branchId = customer.branchId;
            }
        }

        const session = sessions[from];

        try {
            await Customer.upsert({
                phone: from,
                name: profileName || (customer ? customer.name : ''),
                lastInteraction: new Date()
            });
        } catch (e) {
            console.error('Customer tracking error:', e.message);
        }

        let text = extractTextFromMessage(message);
        console.log('FROM:', from, 'TEXT:', text);

        if (text === 'native_order') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT', { type: 'native_order' });
            await handleNativeOrder(from, message, session);
        } else if (text === 'hi' || text === 'hello' || text === 'start' || text === 'menu') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'MENU_VIEWED');
            await handleHomeMenu(from, session, tenant, customer);
        } else if (text === 'track' || text === 'status') {
            await handleTrackOrder(from, session, latestOrder);
        } else if (text === 'search_mode') {
            await handleSearchMode(from, session);
        } else if (session.state === 'SEARCHING') {
            if (text !== 'menu' && text !== 'shop') {
                await logCustomerActivity(from, tenant.id, session.branchId, 'SEARCHED', { query: text });
            }
            const result = await handleSearching(from, text, session);
            if (result === 'RE_ROUTE') {
                if (text === 'menu') await handleHomeMenu(from, session, tenant, customer);
                else if (text === 'shop') await handleShop(from, text, session, tenant, customer);
            }
        } else if (text.startsWith('rate_')) {
            await handleRating(from, text, session);
        } else if (session.state === 'COLLECTING_FEEDBACK' && text.startsWith('star_')) {
            await handleCollectingFeedback(from, text, session);
        } else if (text === 'shop' || text === 'change_category') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'SHOP_VIEWED');
            await handleShop(from, text, session, tenant, customer);
        } else if (text === 'change_branch') {
            await handleChangeBranch(from, session);
        } else if (text.startsWith('branch_')) {
            await handleBranchSelection(from, text, session);
        } else if (text.startsWith('next_page_') || text.startsWith('prev_page_') || text.startsWith('sort_toggle_') || text.startsWith('sort_low_') || text.startsWith('sort_high_') || text.startsWith('sort_name_')) {
            const nextText = await handlePaginationAndSorting(from, text, session);
            if (nextText) await handleCategorySelection(from, nextText, session);
        } else if (text.startsWith('category_')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CATEGORY_VIEWED', { categoryId: text.replace('category_', '') });
            await handleCategorySelection(from, text, session);
        } else if (text.startsWith('product_')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'PRODUCT_VIEWED', { productId: text.replace('product_', '') });
            await handleProductSelection(from, text, session);
        } else if (text.startsWith('add_') || text.startsWith('buy_')) {
            await logCustomerActivity(from, tenant.id, session.branchId, 'ADDED_TO_CART', { productId: text.replace('add_', '').replace('buy_', '') });
            await handleAddToCart(from, text, session);
        } else if (session.state === 'COLLECTING_QUANTITY') {
            await handleQuantitySelection(from, text, session);
        } else if (text === 'cart') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CART_VIEWED');
            await handleCart(from, session);
        } else if (text === 'checkout') {
            await logCustomerActivity(from, tenant.id, session.branchId, 'CHECKOUT_STARTED');
            await handleCheckout(from, session);
        } else if (session.state === 'CHECKOUT_ADDRESS') {
            await handleAddressCollection(from, text, session);
        } else {
            await handleDefault(from, session);
        }

    } catch (error) {
        console.error(error.response?.data || error.message);
    }
};

// =========================
// ABANDONED CART MONITOR
// =========================

const checkAbandonedCarts = async () => {
    const now = new Date();
    const threshold = 1 * 60 * 60 * 1000;

    for (const [phoneNumber, session] of Object.entries(sessions)) {
        const cart = carts[phoneNumber] || [];
        if (cart.length > 0 && session.lastInteraction) {
            const idleTime = now - new Date(session.lastInteraction);

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

setInterval(checkAbandonedCarts, 10 * 60 * 1000);

module.exports = {
    verifyWebhook,
    receiveWebhook
};