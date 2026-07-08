const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const authMiddleware = require('../middlewares/authMiddleware');

const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
    next();
  } else {
    res.status(403).json({ error: 'غير مصرح لك للوصول' });
  }
};

router.use(authMiddleware);

router.get('/status', attendanceController.getStatus);
router.post('/checkin', attendanceController.checkIn);
router.post('/checkout', attendanceController.checkOut);
router.get('/logs', attendanceController.getLogs);

// Admin only route to get all logs
router.get('/all-logs', requireAdmin, attendanceController.getAllLogs);
// Admin route to register absence
router.post('/admin/absence', requireAdmin, attendanceController.registerAbsence);
// Admin route to get today status
router.get('/today-status', requireAdmin, attendanceController.getTodayStatus);
// Admin route to force update status
router.post('/admin/update-status', requireAdmin, attendanceController.adminUpdateStatus);

module.exports = router;
