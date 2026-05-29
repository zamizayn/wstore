const { Tenant, SubscriptionPlan } = require('../models');
const axios = require('axios');
const emailService = require('../services/emailService');

const handleSequelizeError = (e) => {
    if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
        return e.errors.map(err => {
            if (err.validatorKey === 'not_unique') {
                const fieldName = err.path.charAt(0).toUpperCase() + err.path.slice(1);
                return `${fieldName} is already taken`;
            }
            return err.message;
        }).join(', ');
    }
    return e.message;
};

const getMyTenant = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(404).json({ error: 'Tenant context not found' });
        const tenant = await Tenant.findByPk(req.user.tenantId, {
            include: [{ model: SubscriptionPlan, as: 'SubscriptionPlan' }]
        });
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
        
        // Calculate product count dynamically
        const { Product, Branch } = require('../models');
        const { Op } = require('sequelize');
        const branchIds = (await Branch.findAll({ where: { tenantId: tenant.id }, attributes: ['id'] })).map(b => b.id);
        const productCount = await Product.count({ where: { branchId: { [Op.in]: branchIds } } });

        const tenantData = tenant.toJSON();
        tenantData.productUsageCount = productCount;

        res.json(tenantData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getAllTenants = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const search = req.query.search;
        const status = req.query.status;

        const { Op } = require('sequelize');
        let where = {};
        if (search) {
            where.name = { [Op.like]: `%${search}%` };
        }
        if (status === 'active') {
            where.isActive = true;
        } else if (status === 'disabled') {
            where.isActive = false;
        }

        if (!isNaN(page) && !isNaN(limit)) {
            const offset = (page - 1) * limit;
            const { count, rows } = await Tenant.findAndCountAll({
                where,
                order: [['createdAt', 'DESC']],
                limit,
                offset
            });
            return res.json({
                tenants: rows,
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: page
            });
        }

        const tenants = await Tenant.findAll({ where, order: [['createdAt', 'DESC']] });
        res.json(tenants);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const createTenant = async (req, res) => {
    try {
        const tenantData = { ...req.body };

        // Check if contactEmail is already taken
        if (tenantData.contactEmail) {
            const existingEmail = await Tenant.findOne({ where: { contactEmail: tenantData.contactEmail } });
            if (existingEmail) {
                return res.status(400).json({ error: 'Email is already taken' });
            }
        }

        if (req.file) {
            let whatsappSettings = {};
            if (tenantData.whatsappSettings) {
                try {
                    whatsappSettings = typeof tenantData.whatsappSettings === 'string'
                        ? JSON.parse(tenantData.whatsappSettings)
                        : tenantData.whatsappSettings;
                } catch (e) {
                    console.error('Error parsing whatsappSettings:', e);
                }
            }
            whatsappSettings.logo = req.file.path;
            tenantData.whatsappSettings = whatsappSettings;
        } else if (typeof tenantData.whatsappSettings === 'string') {
            try {
                tenantData.whatsappSettings = JSON.parse(tenantData.whatsappSettings);
            } catch (e) {
                // Ignore
            }
        }
        const tenant = await Tenant.create(tenantData);
        emailService.sendWelcomeEmail(tenant).catch(err => {
            console.error('[EmailService] Failed to send welcome email on signup:', err.message);
        });
        res.json(tenant);
    } catch (e) {
        res.status(400).json({ error: handleSequelizeError(e) });
    }
};

const updateTenant = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.params.id);
        if (tenant) {
            if (req.user.role === 'tenant' && req.user.tenantId != req.params.id) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const tenantData = { ...req.body };

            // Check if contactEmail is already taken (excluding current tenant)
            if (tenantData.contactEmail && tenantData.contactEmail !== tenant.contactEmail) {
                const { Op } = require('sequelize');
                const existingEmail = await Tenant.findOne({
                    where: {
                        contactEmail: tenantData.contactEmail,
                        id: { [Op.ne]: tenant.id }
                    }
                });
                if (existingEmail) {
                    return res.status(400).json({ error: 'Email is already taken' });
                }
            }

            if (req.file) {
                let whatsappSettings = tenant.whatsappSettings || {};
                if (tenantData.whatsappSettings) {
                    try {
                        whatsappSettings = typeof tenantData.whatsappSettings === 'string'
                            ? JSON.parse(tenantData.whatsappSettings)
                            : tenantData.whatsappSettings;
                    } catch (e) {
                        console.error('Error parsing whatsappSettings:', e);
                    }
                }
                whatsappSettings.logo = req.file.path;
                tenantData.whatsappSettings = whatsappSettings;
            } else if (typeof tenantData.whatsappSettings === 'string') {
                try {
                    tenantData.whatsappSettings = JSON.parse(tenantData.whatsappSettings);
                } catch (e) {
                    // Ignore
                }
            }
            const oldPaymentStatus = tenant.paymentStatus;
            await tenant.update(tenantData);
            if (oldPaymentStatus !== 'paid' && tenant.paymentStatus === 'paid') {
                emailService.sendPaymentConfirmedEmail(tenant).catch(err => {
                    console.error('[EmailService] Failed to send payment confirmation email on update:', err.message);
                });
            }
            res.json(tenant);
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: handleSequelizeError(e) });
    }
};

const deleteTenant = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.params.id);
        if (tenant) {
            await tenant.destroy();
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const enableWebhooks = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'tenant') return res.status(403).json({ error: 'Access denied' });

        const tenantId = req.user.role === 'tenant' ? req.user.tenantId : req.params.id;

        if (!tenantId || tenantId === 'null') {
            return res.status(400).json({ error: 'Missing or invalid Tenant ID' });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const wabaId = req.body.wabaId || tenant.wabaId;
        const whatsappToken = req.body.whatsappToken || tenant.whatsappToken;

        if (!wabaId || !whatsappToken) {
            return res.status(400).json({ error: 'Missing WABA ID or Access Token' });
        }

        const url = `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`;

        try {
            await axios.post(url, {}, {
                headers: {
                    'Authorization': `Bearer ${whatsappToken}`
                }
            });

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
};

const getSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId, {
            attributes: ['razorpayKeyId', 'razorpayKeySecret', 'razorpayWebhookSecret', 'googleMapsApiKey', 'geminiApiKey', 'whatsappSettings', 'wabaId', 'phoneNumberId', 'whatsappToken']
        });

        const settings = tenant.toJSON();
        settings.storePhone = tenant.whatsappSettings?.phone || '';
        settings.logo = tenant.whatsappSettings?.logo || '';

        res.json(settings);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (tenant) {
            const { razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret, googleMapsApiKey, geminiApiKey, storePhone, wabaId, phoneNumberId, whatsappToken } = req.body;

            const updatedWhatsappSettings = {
                ...(tenant.whatsappSettings || {}),
                phone: storePhone
            };

            if (req.file) {
                updatedWhatsappSettings.logo = req.file.path;
            }

            await tenant.update({
                razorpayKeyId,
                razorpayKeySecret,
                razorpayWebhookSecret,
                googleMapsApiKey,
                geminiApiKey,
                whatsappSettings: updatedWhatsappSettings,
                wabaId,
                phoneNumberId,
                whatsappToken
            });
            res.json({ success: true, logo: updatedWhatsappSettings.logo });
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

const getWhatsAppSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId, {
            attributes: ['whatsappSettings', 'geminiApiKey']
        });
        res.json({
            ...(tenant.whatsappSettings || {}),
            geminiApiKey: tenant.geminiApiKey
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const updateWhatsAppSettings = async (req, res) => {
    try {
        if (!req.user.tenantId) return res.status(403).json({ error: 'Access denied' });
        const tenant = await Tenant.findByPk(req.user.tenantId);
        if (tenant) {
            const { geminiApiKey, ...whatsappSettings } = req.body;
            await tenant.update({
                whatsappSettings,
                geminiApiKey: geminiApiKey || null
            });
            res.json({ success: true });
        } else res.status(404).send();
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

const getRegistrationStatus = async (req, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id, {
            attributes: ['id', 'name', 'paymentStatus']
        });
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getMyTenant,
    getAllTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    enableWebhooks,
    getSettings,
    updateSettings,
    getWhatsAppSettings,
    updateWhatsAppSettings,
    getRegistrationStatus
};
