const { AdvanceRequest, User, Expense, Budget } = require('../models');

// Submit new advance request
exports.submitRequest = async (req, res) => {
  try {
    const { amount, reason, monthKey } = req.body;
    const userId = req.user.id;

    if (!amount || !monthKey) {
      return res.status(400).json({ error: 'Amount and monthKey are required' });
    }

    const request = await AdvanceRequest.create({
      amount,
      reason,
      monthKey,
      userId
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Error submitting advance request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get requests for the current user
exports.getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { monthKey } = req.query;
    
    let whereClause = { userId };
    if (monthKey) {
      whereClause.monthKey = monthKey;
    }

    const requests = await AdvanceRequest.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching user advance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all requests for admins
exports.getAllRequests = async (req, res) => {
  try {
    const { monthKey } = req.query;
    let whereClause = {};
    if (monthKey) {
      whereClause.monthKey = monthKey;
    }

    const requests = await AdvanceRequest.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Requester', attributes: ['id', 'username', 'fullName', 'role'] },
        { model: User, as: 'Approver', attributes: ['id', 'username', 'fullName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching all advance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update status (Approve, Reject, Settle)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'settled'
    const adminId = req.user.id;

    const request = await AdvanceRequest.findByPk(id, {
      include: [{ model: User, as: 'Requester' }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Only allow approving if it's currently pending
    if (status === 'approved' && request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only approve pending requests' });
    }

    // If approving, deduct from admin's budget
    if (status === 'approved') {
      // Find Admin's budget for the same month
      const budget = await Budget.findOne({
        where: { userId: adminId, monthKey: request.monthKey }
      });

      if (!budget) {
        return res.status(400).json({ error: 'You do not have a budget configured for this month. Cannot approve advance.' });
      }

      // Create an expense
      await Expense.create({
        amount: request.amount,
        type: 'advance',
        employeeName: request.Requester.fullName || request.Requester.username,
        notes: `تمت الموافقة من النظام على سلفة: ${request.reason || ''}`,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toISOString().split('T')[1].slice(0, 5),
        userId: adminId,
        budgetId: budget.id
      });
    }

    request.status = status;
    request.adminId = adminId;
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Error updating advance request status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
