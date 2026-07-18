const { SalaryAdjustment, User } = require('../models');

// Get all adjustments for a specific month
exports.getAllAdjustments = async (req, res) => {
  try {
    const { monthKey } = req.query;
    let whereClause = {};
    if (monthKey) {
      whereClause.monthKey = monthKey;
    }

    const adjustments = await SalaryAdjustment.findAll({
      where: whereClause,
      include: [{ model: User, attributes: ['id', 'username', 'fullName'] }]
    });

    res.json(adjustments);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add a new adjustment
exports.addAdjustment = async (req, res) => {
  try {
    const { userId, monthKey, type, amount, reason } = req.body;

    if (!userId || !monthKey || !type || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const adjustment = await SalaryAdjustment.create({
      userId,
      monthKey,
      type, // 'Addition' or 'Deduction'
      amount: Number(amount),
      reason
    });

    res.status(201).json(adjustment);
  } catch (error) {
    console.error('Error adding adjustment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an adjustment
exports.updateAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, reason } = req.body;

    const adjustment = await SalaryAdjustment.findByPk(id);
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    adjustment.type = type || adjustment.type;
    adjustment.amount = amount ? Number(amount) : adjustment.amount;
    adjustment.reason = reason !== undefined ? reason : adjustment.reason;
    
    await adjustment.save();
    res.json(adjustment);
  } catch (error) {
    console.error('Error updating adjustment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an adjustment
exports.deleteAdjustment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const adjustment = await SalaryAdjustment.findByPk(id);
    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    await adjustment.destroy();
    res.json({ message: 'Adjustment deleted successfully' });
  } catch (error) {
    console.error('Error deleting adjustment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
