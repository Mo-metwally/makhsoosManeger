const { Shift, User, AttendanceLog, DayOffRequest, CallReport } = require('../models');
const { Op } = require('sequelize');

exports.createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, workingDays, dayOffType, fixedDaysOff, variableDaysOffCount } = req.body;
    const newShift = await Shift.create({
      name,
      startTime,
      endTime,
      workingDays,
      dayOffType,
      fixedDaysOff,
      variableDaysOffCount
    });
    res.status(201).json(newShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الوردية' });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, workingDays, dayOffType, fixedDaysOff, variableDaysOffCount } = req.body;
    
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }

    await shift.update({
      name,
      startTime,
      endTime,
      workingDays,
      dayOffType,
      fixedDaysOff,
      variableDaysOffCount
    });

    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الوردية' });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      include: [{
        model: User,
        attributes: ['id', 'fullName', 'username', 'role', 'avatar', 'jobTitle']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الورديات' });
  }
};

exports.getShiftStaffStats = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'fullName', 'username', 'role', 'avatar', 'jobTitle'],
          include: [
            { model: AttendanceLog },
            { model: DayOffRequest },
            { model: CallReport }
          ]
        }
      ]
    });

    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const usersWithStats = shift.Users.map(user => {
      const attendanceLogs = user.AttendanceLogs || [];
      const dayOffRequests = user.DayOffRequests || [];
      const callReports = user.CallReports || [];

      // Filter for current month
      const monthLogs = attendanceLogs.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const monthDayOffs = dayOffRequests.filter(req => {
        const d = new Date(req.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear && req.status === 'Approved';
      });

      const monthCalls = callReports.filter(call => {
        const d = new Date(call.createdAt);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const presentDays = monthLogs.filter(l => l.status === 'Present').length;
      const absentDays = monthLogs.filter(l => l.status === 'Absent').length;
      const lateDays = monthLogs.filter(l => l.status === 'Late').length;

      const totalCalls = monthCalls.length;
      const totalDuration = monthCalls.reduce((acc, curr) => acc + (curr.duration || 0), 0);

      return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        jobTitle: user.jobTitle,
        stats: {
          presentDays,
          absentDays,
          lateDays,
          approvedDayOffs: monthDayOffs.length,
          totalCalls,
          totalDuration
        }
      };
    });

    res.json({ shift: { id: shift.id, name: shift.name, workingDays: shift.workingDays, fixedDaysOff: shift.fixedDaysOff, dayOffType: shift.dayOffType, variableDaysOffCount: shift.variableDaysOffCount }, users: usersWithStats });
  } catch (error) {
    console.error('Error fetching shift staff stats:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب إحصائيات الموظفين' });
  }
};

exports.getMyShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [{
        model: Shift,
        through: { attributes: [] },
        include: [{
          model: User,
          attributes: ['id'] // Only need ID for count
        }]
      }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    res.json(user.Shifts || []);
  } catch (error) {
    console.error('Error fetching my shifts:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب وردياتي' });
  }
};

exports.assignUsersToShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of User IDs

    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }

    // Sequelize magic method for many-to-many:
    // This will replace the existing associations with the new ones
    await shift.setUsers(userIds);

    res.json({ message: 'تم تعيين الموظفين للوردية بنجاح' });
  } catch (error) {
    console.error('Error assigning users to shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تعيين الموظفين' });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }
    await shift.destroy();
    res.json({ message: 'تم حذف الوردية بنجاح' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الوردية' });
  }
};
