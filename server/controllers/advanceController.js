const { AdvanceRequest, User, Notification, Shift, AttendanceLog, SalaryAdjustment } = require('../models');
const { Op } = require('sequelize');

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

    const userWithShift = await User.findByPk(userId, {
      include: [{ model: Shift, through: { attributes: [] } }]
    });

    let salary = userWithShift.baseSalary;
    let shift = null;
    if (userWithShift.Shifts && userWithShift.Shifts.length > 0) {
      shift = userWithShift.Shifts[0];
      if (!salary || salary <= 0) {
        salary = shift.baseSalary;
      }
    }

    const logs = await AttendanceLog.findAll({
      where: {
        userId,
        date: { [Op.startsWith]: monthKey }
      }
    });

    let lateMins = 0;
    let absentCount = 0;
    let dayOffWorkCount = 0;
    let presentCount = 0;
    let dayOffCount = 0;

    logs.forEach(log => {
      if (log.status === 'Absent') absentCount++;
      if (log.status === 'DayOffWork') dayOffWorkCount++;
      if (log.status === 'Present' || log.status === 'Late') presentCount++;
      if (log.status === 'DayOff') dayOffCount++;
      if (log.status === 'Late' && log.checkInTime && shift && shift.startTime) {
        const checkIn = new Date(log.checkInTime);
        const expectedStr = `${log.date}T${shift.startTime}`;
        const expectedStart = new Date(expectedStr);
        const diff = Math.floor((checkIn - expectedStart) / 60000);
        if (diff > 0) lateMins += diff;
      }
    });

    let calculatedWorkingHours = 8;
    if (shift && shift.startTime && shift.endTime) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      let diff = endH - startH + (endM - startM) / 60;
      if (diff < 0) diff += 24;
      calculatedWorkingHours = diff || 8;
    }

    res.json({
      requests,
      salary: salary || 0,
      workingHours: shift ? shift.workingHours || calculatedWorkingHours : 8,
      shiftStartTime: shift ? shift.startTime : null,
      shiftEndTime: shift ? shift.endTime : null,
      logs: logs,
      stats: {
        absentCount,
        dayOffWorkCount,
        presentCount,
        dayOffCount
      }
    });
  } catch (error) {
    console.error('Error fetching user advance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get requests for a specific user (Admin only)
exports.getUserRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { monthKey } = req.query;
    
    let whereClause = { userId };
    if (monthKey) {
      whereClause.monthKey = monthKey;
    }

    const requests = await AdvanceRequest.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    const userWithShift = await User.findByPk(userId, {
      include: [{ model: Shift, through: { attributes: [] } }]
    });

    if (!userWithShift) {
      return res.status(404).json({ error: 'User not found' });
    }

    let salary = userWithShift.baseSalary;
    let shift = null;
    if (userWithShift.Shifts && userWithShift.Shifts.length > 0) {
      shift = userWithShift.Shifts[0];
      if (!salary || salary <= 0) {
        salary = shift.baseSalary;
      }
    }

    const logs = await AttendanceLog.findAll({
      where: {
        userId,
        date: { [Op.startsWith]: monthKey }
      }
    });

    let lateMins = 0;
    let absentCount = 0;
    let dayOffWorkCount = 0;
    let presentCount = 0;
    let dayOffCount = 0;

    logs.forEach(log => {
      if (log.status === 'Absent') absentCount++;
      if (log.status === 'DayOffWork') dayOffWorkCount++;
      if (log.status === 'Present' || log.status === 'Late') presentCount++;
      if (log.status === 'DayOff') dayOffCount++;
      if (log.status === 'Late' && log.checkInTime && shift && shift.startTime) {
        const checkIn = new Date(log.checkInTime);
        const expectedStr = `${log.date}T${shift.startTime}`;
        const expectedStart = new Date(expectedStr);
        const diff = Math.floor((checkIn - expectedStart) / 60000);
        if (diff > 0) lateMins += diff;
      }
    });

    const adjustments = await SalaryAdjustment.findAll({
      where: { userId, monthKey }
    });

    let calculatedWorkingHours = 8;
    if (shift && shift.startTime && shift.endTime) {
      const [startH, startM] = shift.startTime.split(':').map(Number);
      const [endH, endM] = shift.endTime.split(':').map(Number);
      let diff = endH - startH + (endM - startM) / 60;
      if (diff < 0) diff += 24;
      calculatedWorkingHours = diff || 8;
    }

    res.json({
      requests,
      salary: salary || 0,
      workingHours: shift ? shift.workingHours || calculatedWorkingHours : 8,
      shiftStartTime: shift ? shift.startTime : null,
      shiftEndTime: shift ? shift.endTime : null,
      logs: logs,
      stats: {
        absentCount,
        dayOffWorkCount,
        lateMins,
        presentCount,
        dayOffCount
      },
      adjustments,
      userProfile: {
        name: userWithShift.fullName || userWithShift.username
      }
    });
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
