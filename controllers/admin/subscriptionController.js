const { Tenant, SubscriptionPlan, SubscriptionHistory } = require('../../models');
const { Op } = require('sequelize');
const {
  sendSubscriptionActivatedEmail,
  sendSubscriptionRenewedEmail,
  sendSubscriptionCancelledEmail
} = require('../../services/emailService');

const handleSequelizeError = (e) => {
  if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
    return e.errors.map(err => err.message).join(', ');
  }
  return e.message;
};

const getAllSubscriptions = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { status, search } = req.query;

    const where = {};
    if (status && status !== 'all') {
      where.subscriptionStatus = status;
    }
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Tenant.findAndCountAll({
      where,
      include: [{ model: SubscriptionPlan, as: 'SubscriptionPlan' }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      subscriptions: rows,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getSubscription = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.tenantId != req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const tenant = await Tenant.findByPk(req.params.id, {
      include: [
        { model: SubscriptionPlan, as: 'SubscriptionPlan' },
        {
          model: SubscriptionHistory,
          limit: 20,
          order: [['createdAt', 'DESC']],
          include: [{ model: SubscriptionPlan }]
        }
      ]
    });
    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ error: 'Tenant not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const renewSubscription = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.tenantId != req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const plan = await SubscriptionPlan.findByPk(tenant.subscriptionPlanId);
    if (!plan) return res.status(404).json({ error: 'Subscription plan not found' });

    const newStartDate = new Date();
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + plan.durationDays);

    tenant.subscriptionStart = newStartDate;
    tenant.subscriptionEnd = newEndDate;
    tenant.subscriptionStatus = 'active';
    await tenant.save();

    await SubscriptionHistory.create({
      tenantId: tenant.id,
      subscriptionPlanId: plan.id,
      action: 'renewed',
      startDate: newStartDate,
      endDate: newEndDate,
      amount: plan.price,
      notes: `Manually renewed by admin`
    });

    await sendSubscriptionRenewedEmail(tenant, plan);

    res.json({ success: true, subscription: tenant });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.tenantId != req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    if (tenant.subscriptionStatus === 'cancelled') {
      return res.status(400).json({ error: 'Subscription is already cancelled' });
    }

    const plan = await SubscriptionPlan.findByPk(tenant.subscriptionPlanId);
    const oldEndDate = tenant.subscriptionEnd;

    tenant.subscriptionStatus = 'cancelled';
    await tenant.save();

    await SubscriptionHistory.create({
      tenantId: tenant.id,
      subscriptionPlanId: plan ? plan.id : null,
      action: 'cancelled',
      startDate: tenant.subscriptionStart,
      endDate: oldEndDate,
      amount: 0,
      notes: req.body.reason || 'Cancelled by admin'
    });

    if (plan) {
      await sendSubscriptionCancelledEmail(tenant, plan, oldEndDate);
    }

    res.json({ success: true, subscription: tenant });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const changePlan = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin' && req.user.tenantId != req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const { newPlanId, reason } = req.body;
    const newPlan = await SubscriptionPlan.findByPk(newPlanId);
    if (!newPlan) return res.status(404).json({ error: 'New plan not found' });

    const oldPlan = await SubscriptionPlan.findByPk(tenant.subscriptionPlanId);
    const oldPlanId = tenant.subscriptionPlanId;
    const isUpgrade = newPlan.price > (oldPlan ? oldPlan.price : 0);

    let proratedAmount = 0;
    if (tenant.subscriptionEnd && oldPlan) {
      const daysRemaining = Math.ceil((new Date(tenant.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining > 0) {
        const dailyRateOld = parseFloat(oldPlan.price) / oldPlan.durationDays;
        const dailyRateNew = parseFloat(newPlan.price) / newPlan.durationDays;
        if (isUpgrade) {
          proratedAmount = Math.round((dailyRateNew - dailyRateOld) * daysRemaining * 100) / 100;
        } else {
          const credit = Math.round(dailyRateOld * daysRemaining * 100) / 100;
          proratedAmount = -credit;
        }
      }
    }

    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + newPlan.durationDays);

    tenant.subscriptionPlanId = newPlan.id;
    tenant.subscriptionStart = new Date();
    tenant.subscriptionEnd = newEndDate;
    tenant.subscriptionStatus = 'active';
    await tenant.save();

    await SubscriptionHistory.create({
      tenantId: tenant.id,
      subscriptionPlanId: newPlan.id,
      previousPlanId: oldPlanId,
      action: isUpgrade ? 'upgraded' : 'downgraded',
      startDate: new Date(),
      endDate: newEndDate,
      amount: newPlan.price,
      proratedAmount,
      notes: reason || (isUpgrade ? 'Plan upgraded' : 'Plan downgraded')
    });

    await sendSubscriptionActivatedEmail(tenant, newPlan);

    res.json({
      success: true,
      subscription: tenant,
      proratedAmount,
      isUpgrade
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getSubscriptionHistory = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (req.user.role !== 'superadmin' && req.user.tenantId != tenantId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await SubscriptionHistory.findAndCountAll({
      where: { tenantId },
      include: [{ model: SubscriptionPlan }],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      history: rows,
      total: count,
      pages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getSubscriptionStats = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Access denied' });
    const total = await Tenant.count();
    const trialing = await Tenant.count({ where: { subscriptionStatus: 'trialing' } });
    const active = await Tenant.count({ where: { subscriptionStatus: 'active' } });
    const expired = await Tenant.count({ where: { subscriptionStatus: 'expired' } });
    const cancelled = await Tenant.count({ where: { subscriptionStatus: 'cancelled' } });
    const paidRegistrations = await Tenant.count({ where: { paymentStatus: 'paid' } });
    const pendingRegistrations = await Tenant.count({ where: { paymentStatus: 'pending' } });

    const now = new Date();
    const expiringSoon = await Tenant.count({
      where: {
        subscriptionStatus: 'active',
        subscriptionEnd: {
          [Op.between]: [now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)]
        }
      }
    });

    res.json({
      total,
      trialing,
      active,
      expired,
      cancelled,
      paidRegistrations,
      pendingRegistrations,
      expiringSoon
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAllSubscriptions,
  getSubscription,
  renewSubscription,
  cancelSubscription,
  changePlan,
  getSubscriptionHistory,
  getSubscriptionStats
};