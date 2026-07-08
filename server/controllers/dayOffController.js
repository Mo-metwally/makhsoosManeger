const { DayOffRequest, User, Shift, Notification } = require('../models');
const { sendDayOffRequestEmail, sendDayOffStatusEmail } = require('../utils/emailService');

// Submit a day off request
exports.submitRequest = async (req, res) => {
  try {
    const { date, dayName, reason } = req.body;
    const userId = req.user.id;
    
    // Check if already requested for this date
    const existing = await DayOffRequest.findOne({ where: { userId, date } });
    if (existing) {
      return res.status(400).json({ error: 'لقد قمت بتقديم طلب إجازة لهذا اليوم مسبقاً.' });
    }

    const request = await DayOffRequest.create({
      userId,
      date,
      dayName,
      reason,
      status: 'Pending'
    });

    // Find the employee to get name
    const employee = await User.findByPk(userId, { include: [Shift] });
    
    if (employee && employee.Shifts && employee.Shifts.length > 0) {
      // Find admins/superadmins in the same shift(s)
      const shiftIds = employee.Shifts.map(s => s.id);
      const admins = await User.findAll({
        where: {
          role: ['Admin', 'SuperAdmin'],
          status: 'Active'
        },
        include: [{
          model: Shift,
          where: { id: shiftIds }
        }]
      });
      
      const adminEmails = admins.map(a => a.email).filter(e => e);
      if (adminEmails.length > 0) {
        await sendDayOffRequestEmail(adminEmails, employee.fullName, date, dayName);
      }

      // Create in-app notification for each admin
      const notifications = admins.map(admin => ({
        userId: admin.id,
        message: `الموظف ${employee.fullName} يطلب إجازة يوم ${dayName} الموافق ${date}.`
      }));
      
      if (notifications.length > 0) {
        await Notification.bulkCreate(notifications);
      }
    }

    res.status(201).json({ message: 'تم تقديم طلب الإجازة بنجاح.', request });
  } catch (error) {
    console.error('Error submitting day off request:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تقديم الطلب.' });
  }
};

// Get requests for the logged-in user + aggregation counts for the next 7 days
exports.getUserRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRequests = await DayOffRequest.findAll({ where: { userId } });
    
    // To show "number of employees who applied" and "number of employees approved" 
    // we fetch ALL requests for future dates to aggregate
    const allRequests = await DayOffRequest.findAll();
    
    res.json({
      userRequests,
      allRequests
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الطلبات.' });
  }
};

// Delete a pending request
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const request = await DayOffRequest.findOne({ where: { id, userId } });
    
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود.' });
    }
    
    if (request.status !== 'Pending') {
      return res.status(400).json({ error: 'لا يمكن إلغاء الطلب بعد الموافقة عليه أو رفضه.' });
    }
    
    await request.destroy();
    res.json({ message: 'تم إلغاء الطلب بنجاح.' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إلغاء الطلب.' });
  }
};

// Get all requests for Admin
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await DayOffRequest.findAll({
      include: [{ 
        model: User, 
        attributes: ['fullName', 'username', 'email'],
        include: [{
          model: Shift,
          attributes: ['id', 'name', 'dayOffType', 'fixedDaysOff', 'variableDaysOffCount'],
          through: { attributes: [] }
        }]
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    console.error('Error fetching all requests:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الطلبات.' });
  }
};

// Update request status (Admin)
exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const request = await DayOffRequest.findByPk(id, { include: [User] });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود.' });
    }

    request.status = status;
    await request.save();

    if (request.User && request.User.email) {
      await sendDayOffStatusEmail(request.User.email, request.User.fullName, request.date, request.dayName, status);
    }

    res.json({ message: 'تم تحديث حالة الطلب بنجاح.', request });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الحالة.' });
  }
};

// Admin manually registers an approved day off
exports.registerDayOff = async (req, res) => {
  try {
    const { userId, date, dayName, reason } = req.body;
    
    // Check if already requested for this date
    const existing = await DayOffRequest.findOne({ where: { userId, date } });
    if (existing) {
      return res.status(400).json({ error: 'الموظف لديه طلب إجازة مسجل بالفعل في هذا اليوم' });
    }

    const request = await DayOffRequest.create({
      userId,
      date,
      dayName,
      reason: reason || 'تسجيل يدوي بواسطة الإدارة',
      status: 'Approved' // auto approved since admin is doing it
    });

    res.status(201).json({ message: 'تم تسجيل إجازة الموظف بنجاح', request });
  } catch (error) {
    console.error('Error registering day off:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الإجازة' });
  }
};
