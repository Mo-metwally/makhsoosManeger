const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const deviceLock = require('../middlewares/deviceLock');

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);

router.get('/me', authMiddleware, deviceLock, authController.me);
router.put('/profile', authMiddleware, deviceLock, authController.updateProfile);
router.put('/change-password', authMiddleware, deviceLock, authController.changePassword);

module.exports = router;
