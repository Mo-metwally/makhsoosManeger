const { Budget, User, Shift, Expense, AdvanceRequest } = require('../models');

// Get budget for the logged-in user
exports.getMyBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // YYYY-MM
    
    if (!month) return res.status(400).json({ error: 'Month is required' });

    let budget = await Budget.findOne({ where: { userId, monthKey: month } });
    
    if (!budget) {
      budget = { monthKey: month, totalBudget: 0, openingBalance: 0 };
    }
    
    res.json(budget);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'خطأ في جلب الميزانية' });
  }
};

// Get budgets for all admins/superadmins (SuperAdmin only)
exports.getAllAdminBudgets = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Month is required' });

    const users = await User.findAll({
      where: {
        role: ['Admin', 'SuperAdmin']
      },
      include: [
        {
          model: Budget,
          where: { monthKey: month },
          required: false,
          include: [
            { model: Expense, required: false }
          ]
        },
        {
          model: Shift,
          through: { attributes: [] },
          required: false
        }
      ]
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching admin budgets:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات المديرين' });
  }
};

// Save or update budget (SuperAdmin only)
exports.saveBudget = async (req, res) => {
  try {
    const { userId, monthKey, totalBudget, openingBalance } = req.body;
    
    if (!userId || !monthKey) {
      return res.status(400).json({ error: 'userId and monthKey are required' });
    }

    let budget = await Budget.findOne({ where: { userId, monthKey } });

    if (budget) {
      budget.totalBudget = totalBudget !== undefined ? totalBudget : budget.totalBudget;
      budget.openingBalance = openingBalance !== undefined ? openingBalance : budget.openingBalance;
      budget.isActive = true;
      await budget.save();
    } else {
      budget = await Budget.create({
        userId,
        monthKey,
        totalBudget: totalBudget || 0,
        openingBalance: openingBalance || 0
      });
    }

    res.json(budget);
  } catch (error) {
    console.error('Error saving budget:', error);
    res.status(500).json({ error: 'خطأ في حفظ الميزانية' });
  }
};

// Delete budget (SuperAdmin only) - Soft Delete
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id);
    if (!budget) return res.status(404).json({ error: 'البطاقة غير موجودة' });

    // Set as inactive instead of destroying, to keep transactions intact
    budget.isActive = false;
    await budget.save();

    res.json({ message: 'تم إيقاف البطاقة بنجاح' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الإيقاف' });
  }
};

// Hard Delete budget (SuperAdmin only)
exports.hardDeleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id);
    if (!budget) return res.status(404).json({ error: 'البطاقة غير موجودة' });

    // Destroy associated expenses first
    await Expense.destroy({ where: { budgetId: id } });

    // Destroy the budget
    await budget.destroy();

    res.json({ message: 'تم الحذف النهائي بنجاح' });
  } catch (error) {
    console.error('Error hard deleting budget:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الحذف النهائي' });
  }
};

// Activate budget (SuperAdmin only)
exports.activateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id);
    if (!budget) return res.status(404).json({ error: 'البطاقة غير موجودة' });

    budget.isActive = true;
    await budget.save();

    res.json({ message: 'تم تنشيط البطاقة بنجاح' });
  } catch (error) {
    console.error('Error activating budget:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء التنشيط' });
  }
};

// Add Expense
exports.addExpense = async (req, res) => {
  try {
    const { amount, type, employeeName, employeeId, item, notes, monthKey, date, time } = req.body;
    const userId = req.user.id;

    if (!amount || !type || !monthKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find active budget for the month to link the expense
    let budget = await Budget.findOne({ where: { userId, monthKey, isActive: true } });
    if (!budget) {
      return res.status(400).json({ error: 'عفواً، لا يوجد بطاقة نشطة لك في هذا الشهر. يرجى الرجوع لمدير النظام لإنشاء بطاقة.' });
    }

    const expense = await Expense.create({
      budgetId: budget.id,
      amount,
      type,
      employeeName,
      item,
      notes,
      monthKey,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toTimeString().split(' ')[0],
      userId
    });

    if (type === 'advance' && employeeId) {
      await AdvanceRequest.create({
        amount,
        reason: notes || item || 'سلفة مباشرة عبر البطاقة',
        status: 'approved', // already approved since directly deducted
        monthKey,
        date: date || new Date().toISOString().split('T')[0],
        userId: employeeId,
        adminId: userId
      });
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ error: 'خطأ في إضافة الخصم' });
  }
};

// Update Expense
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, employeeName, employeeId, item, notes, date, time } = req.body;
    const userId = req.user.id;

    const expense = await Expense.findOne({ where: { id, userId } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const oldAmount = expense.amount;
    const oldType = expense.type;

    expense.amount = amount;
    expense.type = type;
    expense.employeeName = employeeName;
    expense.item = item;
    expense.notes = notes;
    if (date) expense.date = date;
    if (time) expense.time = time;

    await expense.save();

    // If it was an advance, try to update the associated AdvanceRequest
    if (oldType === 'advance' || type === 'advance') {
       // Best effort heuristic: find AdvanceRequest by adminId, amount (old amount), and date
       const advanceReq = await AdvanceRequest.findOne({
         where: { adminId: userId, amount: oldAmount, date: expense.date }
       });
       if (advanceReq) {
         if (type !== 'advance') {
            await advanceReq.destroy(); // Changed type away from advance, so delete
         } else {
            advanceReq.amount = amount;
            advanceReq.reason = notes || item || 'سلفة مباشرة عبر البطاقة';
            if (employeeId) advanceReq.userId = employeeId;
            await advanceReq.save();
         }
       } else if (type === 'advance' && employeeId) {
         // It changed TO advance, or we couldn't find the old one, so create a new one
         await AdvanceRequest.create({
           amount,
           reason: notes || item || 'سلفة مباشرة عبر البطاقة',
           status: 'approved',
           monthKey: expense.monthKey,
           date: expense.date,
           userId: employeeId,
           adminId: userId
         });
       }
    }

    res.json(expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'خطأ في تحديث المصروف' });
  }
};

// Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await Expense.findOne({ where: { id, userId } });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.type === 'advance') {
      const advanceReq = await AdvanceRequest.findOne({
        where: { adminId: userId, amount: expense.amount, date: expense.date }
      });
      if (advanceReq) await advanceReq.destroy();
    }

    await expense.destroy();
    res.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'خطأ في حذف المصروف' });
  }
};

// Get Expenses for the logged-in user and month
exports.getMyExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month) return res.status(400).json({ error: 'Month is required' });

    const budget = await Budget.findOne({ where: { userId, monthKey: month } });
    
    if (!budget) {
      return res.json([]);
    }

    const expenses = await Expense.findAll({
      where: { budgetId: budget.id, userId },
      order: [['date', 'DESC'], ['time', 'DESC']]
    });

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات المصروفات' });
  }
};
