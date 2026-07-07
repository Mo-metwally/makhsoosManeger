const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const deviceLock = require('../middlewares/deviceLock');

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// User requests activation
router.post('/request-activation', authMiddleware, notificationController.requestActivation);

// Admin endpoints
router.get('/', authMiddleware, deviceLock, requireAdmin, notificationController.getNotifications);
router.put('/:id/read', authMiddleware, deviceLock, requireAdmin, notificationController.markAsRead);

module.exports = router;
