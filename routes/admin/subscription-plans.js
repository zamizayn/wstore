const express = require('express');
const router = express.Router();
const subscriptionPlanController = require('../../controllers/subscriptionPlanController');

router.get('/', subscriptionPlanController.getAllSubscriptionPlans);
router.post('/', subscriptionPlanController.createSubscriptionPlan);
router.get('/:id', subscriptionPlanController.getSubscriptionPlan);
router.put('/:id', subscriptionPlanController.updateSubscriptionPlan);
router.delete('/:id', subscriptionPlanController.deleteSubscriptionPlan);
router.put('/:id/toggle', subscriptionPlanController.toggleSubscriptionPlan);
router.put('/order/update', subscriptionPlanController.updateSortOrder);

module.exports = router;