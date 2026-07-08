const express = require('express');
const router = express.Router();
const dayOffController = require('../controllers/dayOffController');
const authMiddleware = require('../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

router.use(authMiddleware);

// User routes
router.post('/', dayOffController.submitRequest);
router.get('/', dayOffController.getUserRequests);
router.delete('/:id', dayOffController.deleteRequest);

// Admin routes
router.get('/all', requireAdmin, dayOffController.getAllRequests);
router.put('/:id/status', requireAdmin, dayOffController.updateRequestStatus);
router.post('/admin/register', requireAdmin, dayOffController.registerDayOff);

module.exports = router;
