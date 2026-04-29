const {
    sendTextMessage,
    sendButtonMessage,
    sendListMessage,
    sendProductCardMessage
} = require('../services/whatsappService');

const { Category, Product, Order, Customer } = require('../models');
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

            // Upsert Customer logic for promotional broadcasts
            try {
                await Customer.upsert({
                    phone: from,
                    name: profileName,
                    lastInteraction: new Date()
                });
            } catch(e) {
                console.error("Customer tracking error:", e.message);
            }

            let text = '';

            // =========================
            // TEXT MESSAGE
            // =========================

            if (message.type === 'text') {

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

            else if (message.type === 'location') {
                const loc = message.location;
                text = `[LOCATION] map: https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
                if (loc.name) text += ` | ${loc.name}`;
                if (loc.address) text += ` | ${loc.address}`;
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
                    state: 'HOME'
                };

                await sendButtonMessage(
                    from,
                    'Welcome to WStore 🛍️',
                    [
                        {
                            id: 'shop',
                            title: 'Shop'
                        },
                        {
                            id: 'cart',
                            title: 'Cart'
                        },
                        {
                            id: 'checkout',
                            title: 'Checkout'
                        }
                    ]
                );
            }

            // =========================
            // SHOP
            // =========================

            else if (
                text === 'shop'
            ) {

                sessions[from] = {
                    state: 'SELECTING_CATEGORY'
                };

                const categories = await Category.findAll();
                const buttons = categories.slice(0, 3).map(c => ({
                    id: c.name.toLowerCase(),
                    title: c.name.charAt(0).toUpperCase() + c.name.slice(1)
                }));

                await sendButtonMessage(
                    from,
                    'Choose Category 👇',
                    buttons
                );
            }

            // =========================
            // CATEGORY SELECTION
            // =========================

            else if (
                sessions[from]?.state ===
                'SELECTING_CATEGORY'
            ) {

                const category = await Category.findOne({ 
                    where: { 
                        name: { [Op.iLike]: text } 
                    } 
                });

                if (category) {

                    sessions[from] = {
                        state: 'SELECTING_PRODUCT'
                    };

                    const catProducts = await Product.findAll({ where: { categoryId: category.id } });

                    await sendListMessage(
                        from,
                        `Choose a ${category.name}`,
                        'View Products',
                        [
                            {
                                title: `${category.name.charAt(0).toUpperCase() + category.name.slice(1)} Collection`,
                                rows:
                                    catProducts.map(product => ({
                                        id: `product_${product.id}`,
                                        title: product.name.slice(0, 24),
                                        description: `₹${product.price}`
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

                const productId = text.replace('product_', '');
                const selectedProduct = await Product.findByPk(productId);

                if (selectedProduct) {

                    sessions[from] = {
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
                text.startsWith('add_')
            ) {

                const productId =
                    text.replace(
                        'add_',
                        ''
                    );

                const selectedProduct = await Product.findByPk(productId);

                if (selectedProduct) {

                    // CREATE CART

                    if (!carts[from]) {

                        carts[from] = [];
                    }

                    // CHECK EXISTING PRODUCT

                    const existingProduct =
                        carts[from].find(
                            item =>
                                item.id ===
                                selectedProduct.id
                        );

                    if (existingProduct) {

                        existingProduct.quantity += 1;
                    }
                    else {

                        carts[from].push({
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            price: selectedProduct.price,
                            quantity: 1
                        });
                    }

                    await sendButtonMessage(
                        from,
                        `✅ ${selectedProduct.name} added to cart`,
                        [
                            {
                                id: 'shop',
                                title: 'Shop More'
                            },
                            {
                                id: 'cart',
                                title: 'View Cart'
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
            // BUY NOW
            // =========================

            else if (
                text.startsWith('buy_')
            ) {

                const productId =
                    text.replace(
                        'buy_',
                        ''
                    );

                const selectedProduct = await Product.findByPk(productId);

                if (selectedProduct) {

                    carts[from] = [
                        {
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            price: selectedProduct.price,
                            quantity: 1
                        }
                    ];

                    sessions[from] = {
                        state: 'CHECKOUT_ADDRESS'
                    };

                    await sendTextMessage(
                        from,
                        `📍 Enter delivery address for ${selectedProduct.name}`
                    );
                }
            }

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
                        state: 'CHECKOUT_ADDRESS'
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

                sessions[from] = {
                    state: 'ORDER_CONFIRMED'
                };

                let savedOrder;
                try {
                    savedOrder = await Order.create({
                        customerPhone: from,
                        address: address,
                        items: userCart,
                        total: total,
                        status: 'pending'
                    });
                } catch(e) {
                    console.error("Order save error:", e);
                }

                // Deduct Inventory Stock
                if (savedOrder) {
                    for (const item of userCart) {
                        try {
                            await Product.decrement('stock', { by: item.quantity, where: { id: item.id } });
                        } catch(e) {
                            console.error(`Stock deduction error for ${item.name}:`, e.message);
                        }
                    }
                }

                carts[from] = [];

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

            // =========================
            // DEFAULT
            // =========================

            else {

                await sendButtonMessage(
                    from,
                    'Choose an option 👇',
                    [
                        {
                            id: 'shop',
                            title: 'Shop'
                        },
                        {
                            id: 'cart',
                            title: 'Cart'
                        },
                        {
                            id: 'checkout',
                            title: 'Checkout'
                        }
                    ]
                );
            }
        }

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            error.response?.data || error.message
        );

        return res.sendStatus(500);
    }
};

module.exports = {
    verifyWebhook,
    receiveWebhook
};