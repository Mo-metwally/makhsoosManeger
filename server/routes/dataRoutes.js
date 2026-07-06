const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const deviceLock = require('../middlewares/deviceLock');

const { 
  getCallReports, 
  saveCallReports,
  getInactivityLogs,
  saveInactivityLogs,
  getPerformanceLogs,
  savePerformanceLog,
  getAllData
} = require('../controllers/dataController');

router.use(authMiddleware);
router.use(deviceLock);

router.get('/calls', getCallReports);
router.post('/calls', saveCallReports);

router.get('/inactivity', getInactivityLogs);
router.post('/inactivity', saveInactivityLogs);

router.get('/performance-logs', getPerformanceLogs);
router.post('/performance-logs', savePerformanceLog);

router.get('/admin/all', getAllData);

module.exports = router;
