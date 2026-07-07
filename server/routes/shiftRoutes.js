const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const authMiddleware = require('../middlewares/authMiddleware');

// Only Admins and SuperAdmins can manage shifts
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'غير مصرح لك للوصول إلى هذا المورد' });
  }
  next();
};

router.use(authMiddleware);

// Route accessible to all authenticated users
router.get('/my-shifts', shiftController.getMyShifts);

router.use(requireAdmin);

router.post('/', shiftController.createShift);
router.get('/', shiftController.getShifts);
router.put('/:id', shiftController.updateShift);
router.put('/:id/assign', shiftController.assignUsersToShift);
router.delete('/:id', shiftController.deleteShift);

module.exports = router;
