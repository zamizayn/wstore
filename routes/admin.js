const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Product, Category, Order, Customer } = require('../models');
const { sendTextMessage } = require('../services/whatsappService');
const { Op, fn, col, literal } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wstore';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

router.use(authenticateToken);

router.get('/categories', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Category.findAndCountAll({
        limit,
        offset,
        order: [['name', 'ASC']]
    });

    res.json({
        data: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
    });
});
router.post('/categories', async (req, res) => {
    const item = await Category.create(req.body);
    res.json(item);
});
router.put('/categories/:id', async (req, res) => {
    const item = await Category.findByPk(req.params.id);
    if(item) {
        await item.update(req.body);
        res.json(item);
    } else res.status(404).send();
});
router.delete('/categories/:id', async (req, res) => {
    const item = await Category.findByPk(req.params.id);
    if(item) {
        await item.destroy();
        res.json({ success: true });
    } else res.status(404).send();
});

router.get('/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
        include: [{ model: Category, as: 'category' }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    });

    res.json({
        data: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
    });
});
router.post('/products', async (req, res) => {
    const item = await Product.create(req.body);
    res.json(item);
});
router.put('/products/:id', async (req, res) => {
    const item = await Product.findByPk(req.params.id);
    if(item) {
        await item.update(req.body);
        res.json(item);
    } else res.status(404).send();
});
router.delete('/products/:id', async (req, res) => {
    const item = await Product.findByPk(req.params.id);
    if(item) {
        await item.destroy();
        res.json({ success: true });
    } else res.status(404).send();
});

// --- Orders API ---
router.post('/orders', async (req, res) => {
    try {
        // Upsert customer so they appear in the Customers list for marketing
        await Customer.upsert({
            phone: req.body.customerPhone,
            name: req.body.customerName || '',
            lastInteraction: new Date()
        });

        const order = await Order.create(req.body);

        // Deduct Inventory Stock
        const items = Array.isArray(req.body.items) ? req.body.items : JSON.parse(req.body.items || '[]');
        for (const item of items) {
            await Product.decrement('stock', { by: item.quantity, where: { id: item.id } });
        }

        res.status(201).json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Order.findAndCountAll({
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.put('/orders/:id/status', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if(!order) return res.status(404).json({ error: 'Order not found' });
        
        order.status = req.body.status;
        await order.save();
        
        let msg = '';
        if (order.status === 'shipped') {
            msg = `🚚 *Update on your Order #${order.id}*\n\nGreat news! Your order has been shipped and is on its way to you!`;
        } else if (order.status === 'delivered') {
            msg = `✅ *Update on your Order #${order.id}*\n\nYour order has been successfully delivered! Thank you for shopping with WStore!`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${order.status.toUpperCase()}*.`;
        }

        try {
            await sendTextMessage(order.customerPhone, msg);
        } catch(e) {
            console.error("WhatsApp notification error:", e.message);
        }

        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Customers & Promotions ---
router.get('/customers', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const { count, rows } = await Customer.findAndCountAll({
            limit,
            offset,
            order: [['lastInteraction', 'DESC']]
        });

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/customers/:phone/orders', async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { customerPhone: req.params.phone },
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/customers/broadcast', async (req, res) => {
    const { phones, message } = req.body;
    if (!phones || !message) return res.status(400).json({ error: 'Missing phones or message' });

    let successCount = 0;
    let failCount = 0;

    for (const phone of phones) {
        try {
            await sendTextMessage(phone, message);
            successCount++;
        } catch (e) {
            console.error(`Broadcast failed for ${phone}:`, e.message);
            failCount++;
        }
    }

    res.json({ successCount, failCount });
});

// --- Analytics API ---
router.get('/analytics', async (req, res) => {
    try {
        const totalOrders = await Order.count();
        const stats = await Order.findAll({
            attributes: [
                [fn('SUM', col('total')), 'revenue'],
                [fn('AVG', col('total')), 'aov']
            ],
            raw: true
        });

        const revenue = parseFloat(stats[0].revenue || 0);
        const aov = parseFloat(stats[0].aov || 0);

        // Sales Trend (Daily for last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const trend = await Order.findAll({
            where: { createdAt: { [Op.gte]: sevenDaysAgo } },
            attributes: [
                [fn('date_trunc', 'day', col('createdAt')), 'date'],
                [fn('SUM', col('total')), 'dailyRevenue']
            ],
            group: [fn('date_trunc', 'day', col('createdAt'))],
            order: [[fn('date_trunc', 'day', col('createdAt')), 'ASC']],
            raw: true
        });

        // Top 5 Products
        // We need to parse 'items' JSON field. In a real heavy app we use associations,
        // but for this JSONB/ARRAY field we can do a quick manual aggregation since the DB is small.
        const allOrders = await Order.findAll({ attributes: ['items'], raw: true });
        const productCounts = {};
        allOrders.forEach(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            items.forEach(it => {
                const name = it.name || 'Unknown';
                productCounts[name] = (productCounts[name] || 0) + (it.quantity || 1);
            });
        });

        const topProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        // Low Stock Items (< 10)
        const lowStock = await Product.findAll({
            where: { stock: { [Op.lte]: 10 } },
            attributes: ['id', 'name', 'stock'],
            raw: true
        });

        // Recent Orders (Last 5)
        const recentOrders = await Order.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // Order Status Distribution
        const statusCounts = await Order.findAll({
            attributes: ['status', [fn('COUNT', col('id')), 'count']],
            group: ['status'],
            raw: true
        });

        // 1. Customer Retention (Repeat Rate)
        const customerOrders = await Order.findAll({
            attributes: ['customerPhone', [fn('COUNT', col('id')), 'orderCount']],
            group: ['customerPhone'],
            raw: true
        });
        const totalCustomers = customerOrders.length;
        const repeatCustomers = customerOrders.filter(c => parseInt(c.orderCount) > 1).length;
        const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        // 2. Revenue by Category
        // We join Orders and Products is complex with JSONB in Sequelize without raw queries,
        // but since we have totalOrders anyway, let's aggregate manually or via a clean join if possible.
        // For simplicity with the current JSONB structure:
        const categoryRevenue = {};
        const ordersForCat = await Order.findAll({ attributes: ['items', 'total'], raw: true });
        ordersForCat.forEach(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            items.forEach(it => {
                const catName = it.categoryName || 'General'; // Ensure categoryName is present in items or fetch it
                categoryRevenue[catName] = (categoryRevenue[catName] || 0) + (it.price * it.quantity);
            });
        });

        // 3. Hourly Sales Trend
        const hourlyStats = await Order.findAll({
            attributes: [
                [fn('date_part', 'hour', col('createdAt')), 'hour'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: [fn('date_part', 'hour', col('createdAt'))],
            raw: true
        });

        res.json({
            revenue,
            aov,
            totalOrders,
            totalCustomers,
            retentionRate: Math.round(retentionRate),
            clv: totalCustomers > 0 ? (revenue / totalCustomers) : 0,
            categoryRevenue: Object.entries(categoryRevenue).map(([name, value]) => ({ name, value })),
            hourlyStats: hourlyStats.map(h => ({ hour: `${h.hour}:00`, count: parseInt(h.count) })),
            trend: trend.map(t => ({
                date: new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: parseFloat(t.dailyRevenue)
            })),
            topProducts,
            recentOrders,
            lowStock,
            statusCounts: statusCounts.reduce((acc, curr) => {
                acc[curr.status] = parseInt(curr.count);
                return acc;
            }, { pending: 0, shipped: 0, delivered: 0 })
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
