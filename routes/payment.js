const express = require('express');
const router = express.Router();
const { handleRazorpayWebhook, createRegistrationPayment } = require('../controllers/paymentController');

router.post('/webhook/:tenantId', handleRazorpayWebhook);
router.post('/registration/:tenantId', handleRazorpayWebhook);
router.post('/registration', createRegistrationPayment);

module.exports = router;
