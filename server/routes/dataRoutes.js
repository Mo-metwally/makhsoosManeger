const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const deviceLock = require('../middlewares/deviceLock');

const { 
  getCallReports, 
  saveCallReports,
  deleteCallReport,
  getInactivityLogs,
  saveInactivityLogs,
  getPerformanceLogs,
  savePerformanceLog,
  getAllData,
  getPersonalStats,
  checkPhoneExists,
  getPhoneHistory,
  getTrackerSettings,
  updateTrackerStatus
} = require('../controllers/dataController');

router.use(authMiddleware);
router.use(deviceLock);

router.get('/calls', getCallReports);
router.post('/calls', saveCallReports);
router.delete('/calls/:id', deleteCallReport);
router.get('/calls/check-phone', checkPhoneExists);
router.get('/calls/history/:phone', getPhoneHistory);

router.get('/inactivity', getInactivityLogs);
router.post('/inactivity', saveInactivityLogs);

router.get('/performance-logs', getPerformanceLogs);
router.post('/performance-logs', savePerformanceLog);

router.get('/admin/all', getAllData);
router.get('/personal-stats', getPersonalStats);

router.get('/tracker-settings', getTrackerSettings);
router.post('/tracker/status', updateTrackerStatus);

module.exports = router;
