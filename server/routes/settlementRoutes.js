const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, settlementController.getSettlements);
router.post('/toggle', authMiddleware, settlementController.toggleSettlement);

module.exports = router;
