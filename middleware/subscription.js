const { Tenant, SubscriptionPlan } = require('../models');
const { sendSubscriptionActivatedEmail } = require('../services/emailService');

const requireActiveSubscription = async (req, res, next) => {
  if (!req.user) return res.sendStatus(401);

  if (req.user.role === 'superadmin') return next();

  if (req.user.role === 'tenant' && req.user.tenantId) {
    const tenant = await Tenant.findByPk(req.user.tenantId, {
      include: [{ model: SubscriptionPlan, as: 'SubscriptionPlan' }]
    });
    if (!tenant) return res.status(403).json({ error: 'Tenant not found' });

    if (tenant.subscriptionStatus === 'active' || tenant.subscriptionStatus === 'trialing') {
      if (tenant.subscriptionEnd && new Date(tenant.subscriptionEnd) < new Date()) {
        tenant.subscriptionStatus = 'expired';
        await tenant.save();
        return res.status(403).json({ error: 'Your subscription has expired. Please renew to continue using the platform.' });
      }

      if (tenant.subscriptionStatus === 'active' && tenant.SubscriptionPlan) {
        await sendSubscriptionActivatedEmail(tenant, tenant.SubscriptionPlan);
      }

      return next();
    }

    return res.status(403).json({ error: 'An active subscription is required to access this resource.' });
  }

  if (req.user.role === 'branch' && req.user.tenantId) {
    const tenant = await Tenant.findByPk(req.user.tenantId);
    if (!tenant) return res.status(403).json({ error: 'Tenant not found' });

    if (tenant.subscriptionStatus === 'active' || tenant.subscriptionStatus === 'trialing') {
      if (tenant.subscriptionEnd && new Date(tenant.subscriptionEnd) < new Date()) {
        tenant.subscriptionStatus = 'expired';
        await tenant.save();
        return res.status(403).json({ error: 'Your subscription has expired. Please contact the store owner.' });
      }
      return next();
    }

    return res.status(403).json({ error: 'Store subscription is inactive. Please contact the store owner.' });
  }

  return next();
};

module.exports = { requireActiveSubscription };