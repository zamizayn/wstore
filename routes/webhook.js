const express = require('express');

const router = express.Router();

const {
    verifyWebhook,
    receiveWebhook,
    verifyGlobalWebhook,
    receiveGlobalWebhook
} = require('../controllers/webhookController');

router.get('/', verifyWebhook);
router.post('/', receiveWebhook);

router.get('/global', verifyGlobalWebhook);
router.post('/global', receiveGlobalWebhook);

module.exports = router;