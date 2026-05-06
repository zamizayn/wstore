const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Product, Category, Order, Customer, Branch, Tenant, CustomerLog, Admin } = require('../models');
const { sendTextMessage, sendButtonMessage, syncProductToMeta } = require('../services/whatsappService');
const { Op, fn, col, literal } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_wstore';

// Helper to get Tenant config for WhatsApp service
const getTenantConfig = async (tenantId) => {
    if (!tenantId) return {};
    const tenant = await Tenant.findByPk(tenantId);
    return tenant ? {
        phoneNumberId: tenant.phoneNumberId,
        whatsappToken: tenant.whatsappToken,
        catalogId: tenant.catalogId
    } : {};
};

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check Superadmin
        const admin = await Admin.findOne({ where: { username, password } });
        if (admin) {
            const token = jwt.sign({ username, role: 'superadmin' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'superadmin' });
        }

        // 2. Check Branch Admin

        const branch = await Branch.findOne({ where: { username, password } });
        if (branch) {
            const token = jwt.sign({
                username,
                role: 'branch',
                branchId: branch.id,
                tenantId: branch.tenantId,
                branchName: branch.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'branch', branchId: branch.id, tenantId: branch.tenantId, tenantName: branch.Tenant?.name || 'Store' });
        }

        // 3. Check Tenant Admin
        const tenant = await Tenant.findOne({ where: { username, password, isActive: true } });
        if (tenant) {
            const token = jwt.sign({
                username,
                role: 'tenant',
                tenantId: tenant.id,
                tenantName: tenant.name
            }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'tenant', tenantId: tenant.id, tenantName: tenant.name });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});

// Allow new tenants to register via the onboarding wizard without a token
router.post('/tenants', async (req, res) => {
    try {
        const tenant = await Tenant.create(req.body);
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Allow branches to be created during onboarding
router.post('/branches', async (req, res) => {
    try {
        const data = { ...req.body };
        // If user is authenticated, we use their tenantId. 
        // If not (onboarding), we trust the tenantId in the body for now.
        const authHeader = req.headers['authorization'];
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token && token !== 'null') {
                try {
                    const user = jwt.verify(token, JWT_SECRET);
                    if (user && user.role === 'tenant') {
                        data.tenantId = user.tenantId;
                    }
                } catch (err) {
                    console.error("Token verification failed during branch creation:", err.message);
                }
            }
        }

        const branch = await Branch.create(data);
        res.json(branch);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;

        // Helper to get scoping where clause
        req.getScope = async (existingWhere = {}) => {
            if (req.user.role === 'superadmin') {
                if (req.query.tenantId) {
                    const branches = await Branch.findAll({
                        where: { tenantId: req.query.tenantId },
                        attributes: ['id']
                    });
                    const branchIds = branches.map(b => b.id);
                    return { ...existingWhere, branchId: { [Op.in]: branchIds } };
                }
                return existingWhere;
            }

            if (req.user.role === 'tenant') {
                // If a specific branch is requested via query, and it belongs to this tenant, use it
                if (req.query.branchId) {
                    const branch = await Branch.findOne({ where: { id: req.query.branchId, tenantId: req.user.tenantId } });
                    if (branch) return { ...existingWhere, branchId: branch.id };
                }

                // Default: Fetch all branch IDs for this tenant
                const branches = await Branch.findAll({
                    where: { tenantId: req.user.tenantId },
                    attributes: ['id']
                });
                const branchIds = branches.map(b => b.id);
                return { ...existingWhere, branchId: { [Op.in]: branchIds } };
            }

            // If branch admin, scope by branchId
            return { ...existingWhere, branchId: req.user.branchId };
        };

        next();
    });
};

router.use(authenticateToken);

router.get('/categories', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Category.findAndCountAll({
        where: await req.getScope(),
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
    const data = { ...req.body };
    if (req.user.role === 'branch') data.branchId = req.user.branchId;
    const item = await Category.create(data);
    res.json(item);
});
router.put('/categories/:id', async (req, res) => {
    const item = await Category.findByPk(req.params.id);
    if (item) {
        await item.update(req.body);
        res.json(item);
    } else res.status(404).send();
});
router.delete('/categories/:id', async (req, res) => {
    const item = await Category.findByPk(req.params.id);
    if (item) {
        await item.destroy();
        res.json({ success: true });
    } else res.status(404).send();
});

router.get('/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Product.findAndCountAll({
        where: await req.getScope(),
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
    const data = { ...req.body };
    if (req.user.role === 'branch') data.branchId = req.user.branchId;

    // 1. Auto-generate retailerId if missing to prevent Sequelize errors
    if (!data.retailerId) {
        // Use a clean, URL-safe ID for Meta
        data.retailerId = `wstore_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }

    try {
        const item = await Product.create(data);

        // 2. Auto-sync to Meta Catalog
        try {
            const tenantId = req.user.tenantId || (await Branch.findByPk(item.branchId))?.tenantId;
            const config = await getTenantConfig(tenantId);
            if (config.catalogId) {
                await syncProductToMeta(item, config);
            }
        } catch (syncError) {
            console.error("Meta auto-sync failed:", syncError.message);
        }

        res.json(item);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});
router.put('/products/:id', async (req, res) => {
    const item = await Product.findByPk(req.params.id);
    if (item) {
        await item.update(req.body);

        // Auto-sync update to Meta Catalog
        try {
            const tenantId = req.user.tenantId || (await Branch.findByPk(item.branchId))?.tenantId;
            const config = await getTenantConfig(tenantId);
            if (config.catalogId) {
                await syncProductToMeta(item, config);
            }
        } catch (syncError) {
            console.error("Meta auto-sync failed (update):", syncError.message);
        }

        res.json(item);
    } else res.status(404).send();
});
router.delete('/products/:id', async (req, res) => {
    const item = await Product.findByPk(req.params.id);
    if (item) {
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
        const { page = 1, limit = 10, status, branchId, search, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = await req.getScope();

        if (status) where.status = status;
        if (branchId) where.branchId = branchId;
        if (search) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { id: isNaN(search) ? -1 : parseInt(search) },
                { customerPhone: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (startDate || endDate) {
            const { Op } = require('sequelize');
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
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
        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (req.body.status === 'cancelled' && req.body.cancellationReason) {
            order.cancellationReason = req.body.cancellationReason;
        }
        order.status = req.body.status;
        await order.save();

        let msg = '';
        if (order.status === 'shipped') {
            msg = `🚚 *Update on your Order #${order.id}*\n\nGreat news! Your order has been shipped and is on its way to you!`;
        } else if (order.status === 'delivered') {
            msg = `✅ *Update on your Order #${order.id}*\n\nYour order has been successfully delivered! Thank you for shopping with WStore!`;
        } else if (order.status === 'cancelled') {
            msg = `❌ *Update on your Order #${order.id}*\n\nYour order has been cancelled.\n\n*Reason:* ${order.cancellationReason || 'Not specified'}`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${order.status.toUpperCase()}*.`;
        }

        try {
            const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);

            if (order.status === 'delivered') {
                // Generate and Send PDF Invoice
                try {
                    const { generateInvoice } = require('../services/invoiceService');
                    const { uploadMedia, sendDocumentMessage } = require('../services/whatsappService');
                    const fs = require('fs');

                    const tenant = await Tenant.findByPk(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
                    const branch = order.branchId ? await Branch.findByPk(order.branchId) : null;

                    console.log(`[Invoice] Generating PDF for Order #${order.id}`);
                    const pdfPath = await generateInvoice(order, tenant, branch);

                    console.log(`[Invoice] Uploading to Meta Media API`);
                    const mediaId = await uploadMedia(pdfPath, 'application/pdf', config);

                    console.log(`[Invoice] Sending document message to ${order.customerPhone}`);
                    await sendDocumentMessage(order.customerPhone, mediaId, `Invoice_${order.id}.pdf`, config);

                    // Cleanup
                    fs.unlinkSync(pdfPath);
                } catch (invError) {
                    console.error("Invoice Automation Failed:", invError.message);
                }

                await sendButtonMessage(order.customerPhone, msg, [
                    { id: `rate_${order.id}`, title: 'Rate Order ⭐' },
                    { id: 'menu', title: 'Main Menu' }
                ], config);
            } else {
                await sendTextMessage(order.customerPhone, msg, config);
            }
        } catch (e) {
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
            where: await req.getScope(),
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

router.get('/customers/:phone/logs', async (req, res) => {
    try {
        const logs = await CustomerLog.findAll({
            where: await req.getScope({ customerPhone: req.params.phone }),
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        // Enrich logs with names for better display
        const enrichedLogs = await Promise.all(logs.map(async (log) => {
            const data = log.toJSON();
            const { details, actionType } = data;

            if (actionType === 'CATEGORY_VIEWED' && details.categoryId && !details.categoryName) {
                const cat = await Category.findByPk(details.categoryId);
                if (cat) details.categoryName = cat.name;
            } else if ((actionType === 'PRODUCT_VIEWED' || actionType === 'ADDED_TO_CART') && details.productId && !details.productName) {
                const prod = await Product.findByPk(details.productId);
                if (prod) details.productName = prod.name;
            }
            return data;
        }));

        res.json(enrichedLogs);
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
            // Scope lookup for tenant config
            // Use req.user.tenantId (added during login)
            const config = await getTenantConfig(req.user.tenantId);
            await sendTextMessage(phone, message, config);
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
        const totalOrders = await Order.count({ where: await req.getScope() });
        const stats = await Order.findAll({
            where: await req.getScope(),
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
            where: await req.getScope({ createdAt: { [Op.gte]: sevenDaysAgo } }),
            attributes: [
                [fn('date_trunc', 'day', col('createdAt')), 'date'],
                [fn('SUM', col('total')), 'dailyRevenue']
            ],
            group: [fn('date_trunc', 'day', col('createdAt'))],
            order: [[fn('date_trunc', 'day', col('createdAt')), 'ASC']],
            raw: true
        });

        // Top 5 Products
        const allOrders = await Order.findAll({
            where: await req.getScope(),
            attributes: ['items'],
            raw: true
        });
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
            where: await req.getScope({ stock: { [Op.lte]: 10 } }),
            attributes: ['id', 'name', 'stock'],
            raw: true
        });

        // Recent Orders (Last 5)
        const recentOrders = await Order.findAll({
            where: await req.getScope(),
            limit: 5,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        // Order Status Distribution
        const statusCounts = await Order.findAll({
            where: await req.getScope(),
            attributes: ['status', [fn('COUNT', col('id')), 'count']],
            group: ['status'],
            raw: true
        });

        // 1. Customer Retention (Repeat Rate)
        const customerOrders = await Order.findAll({
            where: await req.getScope(),
            attributes: ['customerPhone', [fn('COUNT', col('id')), 'orderCount']],
            group: ['customerPhone'],
            raw: true
        });
        const totalCustomers = customerOrders.length;
        const repeatCustomers = customerOrders.filter(c => parseInt(c.orderCount) > 1).length;
        const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

        // 2. Revenue by Category
        const categoryRevenue = {};
        const ordersForCat = await Order.findAll({
            where: await req.getScope(),
            attributes: ['items', 'total'],
            raw: true
        });
        ordersForCat.forEach(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            items.forEach(it => {
                const catName = it.categoryName || 'General'; // Ensure categoryName is present in items or fetch it
                categoryRevenue[catName] = (categoryRevenue[catName] || 0) + (it.price * it.quantity);
            });
        });

        // 3. Hourly Sales Trend
        const hourlyStats = await Order.findAll({
            where: await req.getScope(),
            attributes: [
                [fn('date_part', 'hour', col('createdAt')), 'hour'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: [fn('date_part', 'hour', col('createdAt'))],
            raw: true
        });

        // Add Webhooks Status for Tenant/Branch context
        let webhooksEnabled = false;
        if (req.user.tenantId) {
            const tenant = await Tenant.findByPk(req.user.tenantId);
            webhooksEnabled = tenant?.webhooksEnabled || false;
        }

        res.json({
            revenue,
            webhooksEnabled,
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

router.get('/tenants/me', async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(404).json({ error: 'Tenant context not found' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/tenants', async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
    const tenants = await Tenant.findAll({ order: [['name', 'ASC']] });
    res.json(tenants);
});

router.put('/tenants/:id', async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.params.id);
        if (tenant) {
            // Security: Tenants can only update themselves
            if (req.user.role === 'tenant' && req.user.tenantId != req.params.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            await tenant.update(req.body);
            res.json(tenant);
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.delete('/tenants/:id', async (req, res) => {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
    const tenant = await Tenant.findByPk(req.params.id);
    if (tenant) {
        await tenant.destroy();
        res.json({ success: true });
    } else res.status(404).send();
});

router.post('/tenants/:id/enable-webhooks', async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });

        // If tenant role, enforce their own tenantId. Otherwise use the ID from URL.
        const tenantId = req.user.role === 'tenant' ? req.user.tenantId : req.params.id;

        if (!tenantId || tenantId === 'null') {
            return res.status(400).json({ error: 'Missing or invalid Tenant ID' });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        // Use IDs from request body if provided, fallback to database
        const wabaId = req.body.wabaId || tenant.wabaId;
        const whatsappToken = req.body.whatsappToken || tenant.whatsappToken;

        if (!wabaId || !whatsappToken) {
            return res.status(400).json({ error: 'Missing WABA ID or Access Token' });
        }

        // Call Meta API
        const axios = require('axios');
        const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;

        try {
            await axios.post(url, {}, {
                headers: {
                    'Authorization': `Bearer ${whatsappToken}`
                }
            });

            // Update database flag
            tenant.webhooksEnabled = true;
            await tenant.save();

            res.json({ success: true, message: 'Webhooks enabled and subscribed on Meta' });
        } catch (metaError) {
            console.error('Meta API Error:', metaError.response?.data || metaError.message);
            res.status(500).json({
                error: 'Failed to subscribe on Meta',
                details: metaError.response?.data || metaError.message
            });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Branches Management ---
router.get('/branches', async (req, res) => {
    try {
        if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied' });

        let where = {};
        if (req.user.role === 'tenant') {
            if (!req.user.tenantId) return res.json([]);
            where = { tenantId: req.user.tenantId };
        } else if (req.user.role === 'branch') {
            where = { id: req.user.branchId };
        }
        const branches = await Branch.findAll({
            where,
            include: [{ model: Tenant }], // Removed as: 'Tenant' for broader compatibility
            order: [['name', 'ASC']]
        });
        res.json(branches);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/branches/:id', async (req, res) => {
    // Allow superadmin, tenant, and branch roles (Everyone)
    if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied', role: req.user.role });
    }

    const branch = await Branch.findByPk(req.params.id);
    if (branch) {
        // Tenants and Branch admins can only delete their own branches
        if ((req.user.role === 'tenant' || req.user.role === 'branch') && branch.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        await branch.destroy();
        res.json({ success: true });
    } else res.status(404).send();
});

router.put('/branches/:id', async (req, res) => {
    try {
        if (!['superadmin', 'tenant', 'branch'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const branch = await Branch.findByPk(req.params.id);
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        if (req.user.role === 'tenant' && branch.tenantId !== req.user.tenantId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (req.user.role === 'branch' && branch.id !== req.user.branchId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updateData = { ...req.body };
        if (!updateData.password) {
            delete updateData.password;
        }

        await branch.update(updateData);
        res.json(branch);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
