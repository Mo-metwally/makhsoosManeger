const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const deviceLock = require('../middlewares/deviceLock');

router.post('/login', authController.login);
router.post('/signup', authController.signup);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, deviceLock, authController.me);
router.put('/profile', authMiddleware, deviceLock, authController.updateProfile);

module.exports = router;
