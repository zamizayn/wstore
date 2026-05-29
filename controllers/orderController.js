const { Order, Customer, Product, Branch, Tenant, DeliveryBoy } = require('../models');
const { Op } = require('sequelize');
const { getTenantConfig } = require('../utils/tenantHelpers');
const { sendTextMessage, sendButtonMessage, uploadMedia, sendDocumentMessage } = require('../services/whatsappService');
const { generateInvoice } = require('../services/invoiceService');
const orderService = require('../services/orderService');
const fs = require('fs');

const createOrder = async (req, res) => {
    try {
        await Customer.upsert({
            phone: req.body.customerPhone,
            name: req.body.customerName || '',
            lastInteraction: new Date()
        });

        const order = await Order.create(req.body);

        // Centralized post-order logic (Stock deduction, Offer tracking)
        await orderService.handleOrderSuccess(order);

        res.status(201).json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: DeliveryBoy, as: 'deliveryBoy', attributes: ['id', 'name', 'phone'] }
            ]
        });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, branchId, search, startDate, endDate } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = await req.getScope();

        if (status) where.status = status;
        if (branchId) where.branchId = branchId;
        if (search) {
            where[Op.or] = [
                { id: isNaN(search) ? -1 : parseInt(search) },
                { customerPhone: { [Op.iLike]: `%${search}%` } }
            ];
        }
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name'] },
                { model: DeliveryBoy, as: 'deliveryBoy', attributes: ['id', 'name', 'phone'] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const stats = {
            completed: await Order.count({ where: { ...where, status: 'delivered' } }),
            pending: await Order.count({ where: { ...where, status: { [Op.in]: ['pending', 'shipped'] } } }),
            collected: await Order.sum('total', { where: { ...where, paymentStatus: 'paid' } }) || 0,
            pendingCollection: await Order.sum('total', { where: { ...where, paymentStatus: { [Op.or]: ['unpaid', null, { [Op.ne]: 'paid' }] } } }) || 0
        };

        res.json({
            data: rows,
            total: count,
            page,
            totalPages: Math.ceil(count / limit),
            summary: stats
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateOrderStatus = async (req, res) => {
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
            const items = (order.items || []);
            const lineItems = items.map((item, i) =>
                `${i + 1}. ${item.name} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');
            const subtotal = order.subtotalBeforeTax != null ? parseFloat(order.subtotalBeforeTax) : null;
            const discount = order.discountAmount > 0 ? parseFloat(order.discountAmount) : 0;
            const gst = order.gstAmount > 0 ? parseFloat(order.gstAmount) : 0;
            const total = parseFloat(order.total);
            let pricing = '';
            if (subtotal != null) {
                pricing += `\n*Subtotal:*       ₹${subtotal.toFixed(2)}`;
                if (discount > 0) pricing += `\n*Discount:*       -₹${discount.toFixed(2)}`;
                if (gst > 0) pricing += `\n*GST (${order.gstRate || 0}%):*      +₹${gst.toFixed(2)}`;
            }
            pricing += `\n*Total:*          ₹${total.toFixed(2)}*`;

            msg =
                `✅ *Order Delivered — #${order.id}* 🎉\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `${lineItems}` +
                `\n━━━━━━━━━━━━━━━━━━` +
                pricing +
                `\n━━━━━━━━━━━━━━━━━━\n\n` +
                `Thank you for shopping with us! 🙏`;
        } else if (order.status === 'cancelled') {
            msg = `❌ *Update on your Order #${order.id}*\n\nYour order has been cancelled.\n\n*Reason:* ${order.cancellationReason || 'Not specified'}`;
        } else {
            msg = `🔄 *Update on your Order #${order.id}*\n\nYour order status is now: *${order.status.toUpperCase()}*.`;
        }

        try {
            const config = await getTenantConfig(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);

            if (order.status === 'delivered') {
                try {
                    const tenant = await Tenant.findByPk(order.tenantId || (await Branch.findByPk(order.branchId))?.tenantId);
                    const branch = order.branchId ? await Branch.findByPk(order.branchId) : null;

                    const pdfPath = await generateInvoice(order, tenant, branch);
                    const mediaId = await uploadMedia(pdfPath, 'application/pdf', config);
                    await sendDocumentMessage(order.customerPhone, mediaId, `Invoice_${order.id}.pdf`, config);

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
};

const updatePaymentStatus = async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.paymentStatus = req.body.paymentStatus;
        await order.save();
        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    createOrder,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
    updatePaymentStatus
};
