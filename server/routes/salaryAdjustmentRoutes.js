const express = require('express');
const router = express.Router();
const salaryAdjustmentController = require('../controllers/salaryAdjustmentController');
const authMiddleware = require('../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

router.use(authMiddleware);

// Get all adjustments (Admin only)
router.get('/all', requireAdmin, salaryAdjustmentController.getAllAdjustments);

// Add an adjustment (Admin only)
router.post('/add', requireAdmin, salaryAdjustmentController.addAdjustment);

// Update an adjustment (Admin only)
router.put('/edit/:id', requireAdmin, salaryAdjustmentController.updateAdjustment);

// Delete an adjustment (Admin only)
router.delete('/delete/:id', requireAdmin, salaryAdjustmentController.deleteAdjustment);

module.exports = router;
