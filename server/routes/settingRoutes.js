const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, settingController.getSettings);
router.put('/', authMiddleware, settingController.updateSetting);

module.exports = router;
