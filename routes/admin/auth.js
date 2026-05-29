const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');

const { authenticateToken } = require('../../middleware/auth');
const { loginLimiter, authLimiter } = require('../../middleware/rateLimiter');

router.post('/login', loginLimiter, authController.login);
router.post('/change-password', authenticateToken, authController.changePassword);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
