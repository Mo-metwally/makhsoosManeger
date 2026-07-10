const express = require('express');
const router = express.Router();
const { getMyBudget, getAllAdminBudgets, saveBudget, addExpense, getMyExpenses, updateExpense, deleteExpense } = require('../controllers/budgetController');
const authMiddleware = require('../middlewares/authMiddleware');

const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SuperAdmin') {
    next();
  } else {
    res.status(403).json({ error: 'SuperAdmin access required' });
  }
};

router.use(authMiddleware);

// All authenticated users can fetch their own budget
router.get('/me', getMyBudget);

// Only SuperAdmins can manage budgets
router.get('/admins', requireSuperAdmin, getAllAdminBudgets);
router.post('/', requireSuperAdmin, saveBudget);

// Expenses
router.get('/expenses', getMyExpenses);
router.post('/expenses', addExpense);
router.put('/expenses/:id', updateExpense);
router.delete('/expenses/:id', deleteExpense);

module.exports = router;
