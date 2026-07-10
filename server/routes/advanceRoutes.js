const express = require('express');
const router = express.Router();
const { submitRequest, getMyRequests, getAllRequests, updateStatus } = require('../controllers/advanceController');
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
router.post('/', submitRequest);
router.get('/me', getMyRequests);

// Admin routes
router.get('/all', requireAdmin, getAllRequests);
router.put('/:id/status', requireAdmin, updateStatus);

module.exports = router;
