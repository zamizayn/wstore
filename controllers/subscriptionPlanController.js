const { SubscriptionPlan } = require('../models');

const handleSequelizeError = (e) => {
  if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
    return e.errors.map(err => err.message).join(', ');
  }
  return e.message;
};

const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']]
    });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (plan) {
      res.json(plan);
    } else {
      res.status(404).json({ error: 'Subscription plan not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    res.status(201).json(plan);
  } catch (e) {
    res.status(400).json({ error: handleSequelizeError(e) });
  }
};

const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (plan) {
      await plan.update(req.body);
      res.json(plan);
    } else {
      res.status(404).json({ error: 'Subscription plan not found' });
    }
  } catch (e) {
    res.status(400).json({ error: handleSequelizeError(e) });
  }
};

const deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (plan) {
      const tenantsUsingPlan = await plan.countTenants();
      if (tenantsUsingPlan > 0) {
        return res.status(400).json({ error: `Cannot delete plan. It is currently used by ${tenantsUsingPlan} tenant(s).` });
      }
      await plan.destroy();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Subscription plan not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const toggleSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByPk(req.params.id);
    if (plan) {
      plan.isActive = !plan.isActive;
      await plan.save();
      res.json(plan);
    } else {
      res.status(404).json({ error: 'Subscription plan not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateSortOrder = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Order must be an array of {id, sortOrder}' });
    }
    for (const item of order) {
      await SubscriptionPlan.update({ sortOrder: item.sortOrder }, { where: { id: item.id } });
    }
    const plans = await SubscriptionPlan.findAll({ order: [['sortOrder', 'ASC']] });
    res.json(plans);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = {
  getAllSubscriptionPlans,
  getSubscriptionPlan,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  toggleSubscriptionPlan,
  updateSortOrder
};