const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Admin, Tenant, Branch, Product, Category, Order } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'wstore-secret-123';

// Auth Middleware for App
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await Admin.findByPk(decoded.id);
        if (!user) throw new Error();

        req.user = user;
        
        // Scoping helper (reused from admin)
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
                if (req.query.branchId) {
                    const branch = await Branch.findOne({ where: { id: req.query.branchId, tenantId: req.user.tenantId } });
                    if (branch) return { ...existingWhere, branchId: branch.id };
                }
                const branches = await Branch.findAll({
                    where: { tenantId: req.user.tenantId },
                    attributes: ['id']
                });
                const branchIds = branches.map(b => b.id);
                return { ...existingWhere, branchId: { [Op.in]: branchIds } };
            }

            // For branch-level users, always restrict to their branch
            return { ...existingWhere, branchId: req.user.branchId };
        };

        next();
    } catch (e) {
        res.status(401).json({ error: 'Please authenticate.' });
    }
};

// Login (Reused logic)
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await Admin.findOne({ where: { username } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
        res.json({ token, role: user.role, name: user.name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Overview Stats (Mobile friendly)
router.get('/overview', auth, async (req, res) => {
    try {
        const where = await req.getScope();
        
        const totalOrders = await Order.count({ where });
        const pendingOrders = await Order.count({ where: { ...where, status: 'pending' } });
        
        const orders = await Order.findAll({ where, attributes: ['total'], raw: true });
        const totalRevenue = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

        res.json({
            totalRevenue,
            totalOrders,
            pendingOrders,
            role: req.user.role
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Recent Orders
router.get('/orders', auth, async (req, res) => {
    try {
        const where = await req.getScope();
        const orders = await Order.findAll({
            where,
            limit: 20,
            order: [['createdAt', 'DESC']],
            include: [{ model: Branch, as: 'branch', attributes: ['name'] }]
        });
        res.json(orders);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Products (Mobile inventory view)
router.get('/products', auth, async (req, res) => {
    try {
        const { search, categoryId } = req.query;
        const where = await req.getScope();
        
        if (search) where.name = { [Op.iLike]: `%${search}%` };
        if (categoryId) where.categoryId = categoryId;

        const products = await Product.findAll({
            where,
            include: [{ model: Category, as: 'category', attributes: ['name'] }],
            order: [['name', 'ASC']]
        });
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Notifications
router.get('/notifications', auth, async (req, res) => {
    try {
        const { Notification } = require('../models');
        const where = await req.getScope();
        const notifications = await Notification.findAll({
            where,
            limit: 50,
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Product Sales Analytics (Mobile optimized)
router.get('/product-sales', auth, async (req, res) => {
    try {
        const { startDate, endDate, branchId } = req.query;
        const where = await req.getScope();
        
        if (branchId) where.branchId = branchId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const orders = await Order.findAll({
            where: { ...where, status: { [Op.ne]: 'cancelled' } },
            attributes: ['items'],
            raw: true
        });

        const sales = {};
        orders.forEach(o => {
            const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            if (Array.isArray(items)) {
                items.forEach(it => {
                    const id = it.id || 'unknown';
                    if (!sales[id]) sales[id] = { id, name: it.name, totalQuantity: 0, totalRevenue: 0 };
                    sales[id].totalQuantity += (it.quantity || 0);
                    sales[id].totalRevenue += (it.quantity || 0) * (it.price || 0);
                });
            }
        });

        res.json(Object.values(sales).sort((a, b) => b.totalRevenue - a.totalRevenue));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
