const express = require('express');
const router = express.Router();
const tenantController = require('../../controllers/tenantController');

// Basic listing and detail
router.get('/', tenantController.getAllTenants);
router.get('/me', tenantController.getMyTenant);

const { upload } = require('../../services/cloudinaryService');

// CRUD
router.post('/', upload.single('logo'), tenantController.createTenant); // Note: Used in onboarding without token
router.put('/:id', upload.single('logo'), tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);

// Operations
router.get('/me/settings', tenantController.getSettings);
router.put('/me/settings', upload.single('logo'), tenantController.updateSettings);
router.get('/me/whatsapp-settings', tenantController.getWhatsAppSettings);
router.put('/me/whatsapp-settings', tenantController.updateWhatsAppSettings);
router.post('/:id/enable-webhooks', tenantController.enableWebhooks);

module.exports = router;
