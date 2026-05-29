const express = require('express');
const router = express.Router();
const subscriptionController = require('../../controllers/admin/subscriptionController');

router.get('/', subscriptionController.getAllSubscriptions);
router.get('/stats', subscriptionController.getSubscriptionStats);
router.get('/:id', subscriptionController.getSubscription);
router.put('/:id/renew', subscriptionController.renewSubscription);
router.put('/:id/cancel', subscriptionController.cancelSubscription);
router.put('/:id/change-plan', subscriptionController.changePlan);
router.get('/:tenantId/history', subscriptionController.getSubscriptionHistory);

module.exports = router;