const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DeliveryBoy, Order, Customer, Branch, FcmToken, Tenant } = require('../models');
const { JWT_SECRET } = require('../middleware/auth');
const { Op } = require('sequelize');
const { sendToTenant } = require('../services/notificationService');
const { sendTextMessage, sendDocumentMessage, uploadMedia } = require('../services/whatsappService');
const { generateInvoice } = require('../services/invoiceService');
const fs = require('fs');

const login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const deliveryBoy = await DeliveryBoy.findOne({
            where: { phone, status: 'active' },
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
        });

        if (!deliveryBoy) {
            return res.status(401).json({ error: 'Invalid credentials or account inactive' });
        }

        const valid = await bcrypt.compare(password, deliveryBoy.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials or account inactive' });
        }

        const token = jwt.sign({
            id: deliveryBoy.id,
            name: deliveryBoy.name,
            phone: deliveryBoy.phone,
            role: 'delivery',
            branchId: deliveryBoy.branchId,
            branchName: deliveryBoy.branch?.name
        }, JWT_SECRET, { expiresIn: '24h' });

        res.json({
            token,
            deliveryBoy: {
                id: deliveryBoy.id,
                name: deliveryBoy.name,
                phone: deliveryBoy.phone,
                branchId: deliveryBoy.branchId,
                branchName: deliveryBoy.branch?.name
            }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getOrders = async (req, res) => {
    try {
        const deliveryBoyId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const where = { deliveryBoyId };

        if (status) {
            if (status === 'active') {
                where.status = { [Op.in]: ['accepted', 'picked_up'] };
            } else {
                where.status = status;
            }
        } else {
            where.status = { [Op.notIn]: ['cancelled', 'delivered'] };
        }

        const { count, rows } = await Order.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['name', 'phone'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'latitude', 'longitude'] }
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        const data = rows.map(order => {
            const plain = order.get({ plain: true });
            let distance = null;
            if (plain.branch?.latitude && plain.branch?.longitude && plain.deliveryLatitude && plain.deliveryLongitude) {
                distance = calculateDistance(
                    parseFloat(plain.branch.latitude),
                    parseFloat(plain.branch.longitude),
                    parseFloat(plain.deliveryLatitude),
                    parseFloat(plain.deliveryLongitude)
                );
                distance = Math.round(distance * 100) / 100;
            }
            return { ...plain, distanceFromBranch: distance };
        });

        res.json({ data, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findOne({
            where: { id: req.params.id, deliveryBoyId: req.user.id },
            include: [
                { model: Customer, as: 'customer', attributes: ['name', 'phone'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'latitude', 'longitude'] }
            ]
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const plain = order.get({ plain: true });
        let distance = null;
        if (plain.branch?.latitude && plain.branch?.longitude && plain.deliveryLatitude && plain.deliveryLongitude) {
            distance = calculateDistance(
                parseFloat(plain.branch.latitude),
                parseFloat(plain.branch.longitude),
                parseFloat(plain.deliveryLatitude),
                parseFloat(plain.deliveryLongitude)
            );
            distance = Math.round(distance * 100) / 100;
        }

        res.json({ ...plain, distanceFromBranch: distance });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validTransitions = {
            'pending': ['accepted'],
            'accepted': ['picked_up', 'cancelled'],
            'picked_up': ['delivered', 'cancelled']
        };

        const order = await Order.findOne({
            where: { id: req.params.id, deliveryBoyId: req.user.id },
            include: [
                { model: Branch, as: 'branch', attributes: ['tenantId'] },
                { model: DeliveryBoy, as: 'deliveryBoy', attributes: ['name', 'phone'] }
            ]
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const allowedNext = validTransitions[order.status];
        if (!allowedNext || !allowedNext.includes(status)) {
            return res.status(400).json({
                error: `Cannot transition from '${order.status}' to '${status}'`
            });
        }

        order.status = status;
        await order.save();

        // Notify tenant about status change
        const tenantId = order.branch?.tenantId;
        if (tenantId) {
            sendToTenant(tenantId, `🚚 Order #${order.id} ${status}`,
                `Delivery boy updated order #${order.id} to ${status}`,
                'order_update',
                { orderId: order.id, status }
            ).catch(() => {});
        }

        // Notify customer when picked up
        if (status === 'picked_up') {
            sendDeliveryUpdate(order).catch(e =>
                console.error('Delivery update error:', e.message)
            );
        }

        // Notify customer when delivered
        if (status === 'delivered') {
            sendDeliveryDelivered(order).catch(e =>
                console.error('Delivery delivered error:', e.message)
            );
        }

        res.json(order);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const sendDeliveryUpdate = async (order) => {
    const tenantId = order.branch?.tenantId;
    if (!tenantId) return;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return;

    const config = {
        phoneNumberId: tenant.phoneNumberId,
        whatsappToken: tenant.whatsappToken
    };

    const deliveryBoy = order.deliveryBoy;
    const estimatedMinutes = 30;

    const msg =
        `🛵 *Delivery Update — Order #${order.id}*\n\n` +
        `Your order has been picked up and is on its way! 🎉\n\n` +
        `👤 *Delivery Boy:* ${deliveryBoy?.name || 'N/A'}\n` +
        `📞 *Phone:* ${deliveryBoy?.phone || 'N/A'}\n` +
        `⏱ *Estimated Delivery:* ${estimatedMinutes} minutes\n\n` +
        `Thank you for choosing ${tenant.name}! 🙏`;

    await sendTextMessage(order.customerPhone, msg, config);
};

const sendDeliveryDelivered = async (order) => {
    const tenantId = order.branch?.tenantId;
    if (!tenantId) return;

    const [tenant, customer] = await Promise.all([
        Tenant.findByPk(tenantId),
        order.customerPhone ? Customer.findOne({ where: { phone: order.customerPhone } }) : null
    ]);
    if (!tenant) return;

    const config = {
        phoneNumberId: tenant.phoneNumberId,
        whatsappToken: tenant.whatsappToken
    };

    const items = (order.items || []);
    const lineItems = items.map((item, i) =>
        `${i + 1}. ${item.name} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const customerName = customer?.name || 'Valued Customer';
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

    const msg =
        `✅ *Order Delivered — #${order.id}* 🎉\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `${lineItems}` +
        `\n━━━━━━━━━━━━━━━━━━` +
        pricing +
        `\n━━━━━━━━━━━━━━━━━━\n\n` +
        `Thank you for shopping with ${tenant.name}, ${customerName}! 🙏`;

    await sendTextMessage(order.customerPhone, msg, config);

    // Send PDF invoice
    try {
        const branch = order.branchId ? await Branch.findByPk(order.branchId) : null;
        const pdfPath = await generateInvoice(order, tenant, branch);
        const mediaId = await uploadMedia(pdfPath, 'application/pdf', config);
        await sendDocumentMessage(order.customerPhone, mediaId, `Invoice_${order.id}.pdf`, config);
        fs.unlinkSync(pdfPath);
    } catch (invError) {
        console.error("Invoice PDF failed:", invError.message);
    }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const registerFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const deliveryBoyId = req.user.id;
        const [fcm, created] = await FcmToken.findOrCreate({
            where: { token },
            defaults: {
                token,
                adminId: deliveryBoyId,
                deliveryBoyId,
                branchId: req.user.branchId || null,
                role: 'delivery'
            }
        });

        if (!created) {
            await fcm.update({
                adminId: deliveryBoyId,
                deliveryBoyId,
                branchId: req.user.branchId || null,
                role: 'delivery'
            });
        }

        res.json({ success: true, created });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const unregisterFcmToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (token) {
            await FcmToken.destroy({ where: { token, deliveryBoyId: req.user.id } });
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = { login, getOrders, getOrderById, updateOrderStatus, registerFcmToken, unregisterFcmToken };
