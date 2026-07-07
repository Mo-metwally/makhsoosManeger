const express = require('express');
const router = express.Router();
const { getPendingUsers, getAllUsers, approveUser, suspendUser, changeRole, getAllCalls, updateUser, unlockDevice } = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');

// Middleware to ensure the user is an admin
const requireAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/users/pending', getPendingUsers);
router.get('/users', getAllUsers);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/role', changeRole);
router.put('/users/:id/unlock-device', unlockDevice);
router.put('/users/:id', updateUser);

router.get('/calls', getAllCalls);

module.exports = router;
