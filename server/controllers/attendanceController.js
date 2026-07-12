const { AttendanceLog, Shift, User, DayOffRequest, InactivityLog } = require('../models');
const { getLogicalDate } = require('../utils/dateUtils');
const { Op } = require('sequelize');

// Helper: Get active shift for a user for a given day name
// dayName format: 'Saturday', 'Sunday', etc.
const getActiveShiftForDay = async (userId, dayName) => {
  const user = await User.findByPk(userId, {
    include: [{
      model: Shift,
      through: { attributes: [] }
    }]
  });
  if (!user || !user.Shifts) return null;
  
  return user.Shifts.find(shift => shift.workingDays.includes(dayName));
};

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getLogicalDate(); // YYYY-MM-DD
    
    // Find an unclosed log from any day
    const unclosedLog = await AttendanceLog.findOne({
      where: { userId, checkOutTime: null },
      include: [{ model: Shift, attributes: ['name', 'startTime', 'endTime'] }]
    });

    // Find a log from today
    const todayLog = await AttendanceLog.findOne({
      where: { userId, date: today },
      include: [{ model: Shift, attributes: ['name', 'startTime', 'endTime'] }]
    });

    const activeLog = unclosedLog || todayLog;
    const hasCheckedIn = !!activeLog;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];
    const activeShift = await getActiveShiftForDay(userId, dayName);

    res.json({ 
      hasCheckedIn, 
      log: activeLog, 
      hasShiftToday: !!activeShift,
      shift: activeShift 
    });
  } catch (error) {
    console.error('Error fetching attendance status:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب حالة الحضور' });
  }
};

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getLogicalDate();
    
    // Check if already checked in
    const existingLog = await AttendanceLog.findOne({ where: { userId, date: today } });
    if (existingLog) {
      return res.status(400).json({ error: 'لقد قمت بتسجيل الحضور مسبقاً لهذا اليوم' });
    }

    // Get today's day name in English
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];

    const activeShift = await getActiveShiftForDay(userId, dayName);
    
    if (!activeShift) {
      return res.status(400).json({ error: 'ليس لديك وردية عمل مخصصة لهذا اليوم' });
    }

    // Server time for check-in
    const checkInTime = new Date();

    const log = await AttendanceLog.create({
      userId,
      shiftId: activeShift.id,
      date: today,
      checkInTime
    });

    res.status(201).json({ message: 'تم تسجيل الحضور بنجاح', log });
  } catch (error) {
    console.error('Error checking in:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الحضور' });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getLogicalDate();

    // Find the most recent unclosed log
    const log = await AttendanceLog.findOne({ 
      where: { userId, checkOutTime: null },
      order: [['createdAt', 'DESC']]
    });
    
    if (!log) {
      return res.status(404).json({ error: 'لا يوجد حضور مفتوح لتسجيل الانصراف' });
    }
    
    if (log.checkOutTime) {
      return res.status(400).json({ error: 'لقد قمت بتسجيل الانصراف مسبقاً' });
    }

    log.checkOutTime = new Date();
    await log.save();

    res.json({ message: 'تم تسجيل الانصراف بنجاح', log });
  } catch (error) {
    console.error('Error checking out:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الانصراف' });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logs = await AttendanceLog.findAll({
      where: { userId: req.user.id },
      include: [Shift],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    const logs = await AttendanceLog.findAll({
      include: [
        { model: Shift },
        { model: User, attributes: ['id', 'fullName', 'username', 'jobTitle'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    const inactivityLogs = await InactivityLog.findAll();
    const breakMap = {}; // Key: "userId-YYYY-MM-DD"

    inactivityLogs.forEach(log => {
      if (!log.startTime) return;
      const dateStr = log.startTime.split('T')[0];
      const key = `${log.userId}-${dateStr}`;
      
      if (!breakMap[key]) {
        breakMap[key] = { 'بريك صلاة': 0, 'بريك غداء': 0 };
      }
      if (log.type === 'بريك صلاة' || log.type === 'بريك غداء') {
        breakMap[key][log.type] += (log.durationMs || 0);
      }
    });

    const resultLogs = logs.map(log => {
      const logData = log.toJSON();
      const key = `${log.userId}-${log.date}`;
      logData.breakDetails = breakMap[key] || { 'بريك صلاة': 0, 'بريك غداء': 0 };
      return logData;
    });

    res.json(resultLogs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.registerAbsence = async (req, res) => {
  try {
    const { userId, date } = req.body;
    if (!userId || !date) {
      return res.status(400).json({ error: 'يجب تحديد الموظف والتاريخ' });
    }
    
    const existingLog = await AttendanceLog.findOne({ where: { userId, date } });
    if (existingLog) {
      return res.status(400).json({ error: 'يوجد سجل حضور/غياب مسبق لهذا الموظف في هذا اليوم' });
    }

    const user = await User.findByPk(userId, {
      include: [{
        model: Shift,
        through: { attributes: [] }
      }]
    });
    
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    const d = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[d.getDay()];
    
    const activeShift = user.Shifts && user.Shifts.find(shift => shift.workingDays.includes(dayName));
    const shiftId = activeShift ? activeShift.id : (user.Shifts && user.Shifts.length > 0 ? user.Shifts[0].id : null);
    
    if (!shiftId) {
      return res.status(400).json({ error: 'لا يمكن تسجيل الغياب: الموظف غير مرتبط بأي وردية' });
    }

    const log = await AttendanceLog.create({
      userId,
      shiftId,
      date,
      status: 'Absent'
    });

    res.status(201).json({ message: 'تم تسجيل غياب الموظف بنجاح', log });
  } catch (error) {
    console.error('Error registering absence:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الغياب' });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    
    // Find shifts the admin belongs to
    const adminUser = await User.findByPk(adminId, {
      include: [{ model: Shift, through: { attributes: [] } }]
    });

    let adminShifts = [];
    if (adminUser && adminUser.Shifts) {
      adminShifts = adminUser.Shifts.map(s => ({
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime
      }));
    }

    // Get all users
    const usersInShifts = await User.findAll({
      include: [
        { 
          model: Shift, 
          through: { attributes: [] }
        }
      ],
      where: {
        status: 'Active',
        role: ['Admin', 'Supervisor']
      },
      attributes: ['id', 'fullName', 'username', 'avatar', 'jobTitle']
    });

    if (usersInShifts.length === 0) {
      return res.json({ adminShifts, users: [] });
    }

    const userIds = usersInShifts.map(u => u.id);

    // Get today's attendance logs for these users
    const today = getLogicalDate();
    
    const attendances = await AttendanceLog.findAll({
      where: {
        userId: userIds,
        date: today
      }
    });

    // Get today's approved dayoffs for these users
    const dayoffs = await DayOffRequest.findAll({
      where: {
        userId: userIds,
        date: today,
        status: 'Approved'
      }
    });

    const attendanceMap = {};
    attendances.forEach(a => {
      attendanceMap[a.userId] = {
        status: a.status || (a.checkOutTime ? 'Present' : 'Present'),
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime
      };
    });

    const dayoffMap = {};
    dayoffs.forEach(d => {
      dayoffMap[d.userId] = 'DayOff';
    });

    // Get today's inactivity (break) logs
    const inactiveLogs = await InactivityLog.findAll({
      where: {
        userId: userIds,
        startTime: { [Op.startsWith]: today }
      }
    });

    const breakMap = {};
    const activeBreakMap = {}; // Key: userId, Value: break type

    inactiveLogs.forEach(log => {
      // Check if this log is an active break (no endTime)
      if (!log.endTime) {
        activeBreakMap[log.userId] = log.type;
      }

      if (!breakMap[log.userId]) {
        breakMap[log.userId] = { 'بريك صلاة': 0, 'بريك غداء': 0 };
      }
      if (log.type === 'بريك صلاة' || log.type === 'بريك غداء') {
        breakMap[log.userId][log.type] += (log.durationMs || 0);
      }
    });

    // Combine data
    const result = usersInShifts.map(user => {
      let todayStatus = 'Pending'; // Default: Not attended yet
      let checkInTime = null;
      let checkOutTime = null;
      
      if (attendanceMap[user.id]) {
        todayStatus = attendanceMap[user.id].status; // Present, Absent, Late
        checkInTime = attendanceMap[user.id].checkInTime;
        checkOutTime = attendanceMap[user.id].checkOutTime;
      } else if (dayoffMap[user.id]) {
        todayStatus = 'DayOff';
      }

      // Override status if currently on a break
      if (activeBreakMap[user.id]) {
        todayStatus = activeBreakMap[user.id];
      }

      let lateMinutes = 0;
      if (checkInTime && user.Shifts.length > 0) {
        const shift = user.Shifts[0];
        if (shift.startTime) {
           const checkInDate = new Date(checkInTime);
           const [sh, sm] = shift.startTime.split(':').map(Number);
           const expected = new Date(checkInDate);
           expected.setHours(sh, sm, 0, 0);
           const diff = Math.floor((checkInDate - expected) / 60000);
           if (diff > 0) lateMinutes = diff;
        }
      }

      return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar,
        jobTitle: user.jobTitle,
        shifts: user.Shifts.map(s => s.name),
        todayStatus,
        checkInTime,
        checkOutTime,
        lateMinutes,
        breakDetails: breakMap[user.id] || { 'بريك صلاة': 0, 'بريك غداء': 0 }
      };
    });

    // Sort by name
    result.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));

    res.json({
      adminShifts,
      users: result
    });
  } catch (error) {
    console.error('Error in getTodayStatus:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.adminUpdateStatus = async (req, res) => {
  try {
    const { userId, action, notes, manualCheckInTime, manualCheckOutTime } = req.body;
    
    if (!userId || !action) {
      return res.status(400).json({ error: 'يجب توفير معرف الموظف والإجراء' });
    }

    const today = getLogicalDate();

    const getValidDate = (timeString) => {
      if (!timeString) return null;
      return new Date(`${today}T${timeString}:00`);
    };

    let checkInDate = getValidDate(manualCheckInTime);
    let checkOutDate = getValidDate(manualCheckOutTime);
    
    const user = await User.findByPk(userId, {
      include: [{ model: Shift, through: { attributes: [] } }]
    });

    if (!user) return res.status(404).json({ error: 'الموظف غير موجود' });

    // Determine shiftId
    const d = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[d.getDay()];
    const activeShift = user.Shifts && user.Shifts.find(shift => shift.workingDays.includes(dayName));
    const shiftId = activeShift ? activeShift.id : (user.Shifts && user.Shifts.length > 0 ? user.Shifts[0].id : null);

    if (!shiftId && action !== 'DayOff') {
      return res.status(400).json({ error: 'الموظف غير مرتبط بوردية' });
    }

    // Find existing logs
    let attendance = await AttendanceLog.findOne({ where: { userId, date: today } });
    let dayOff = await DayOffRequest.findOne({ where: { userId, date: today } });

    switch (action) {
      case 'CheckIn':
      case 'CheckOut':
      case 'EditTimes':
        if (dayOff) await dayOff.destroy();
        if (!attendance) {
          await AttendanceLog.create({
            userId, shiftId, date: today, status: 'Present', 
            checkInTime: checkInDate || (action === 'CheckIn' ? new Date() : null),
            checkOutTime: checkOutDate || (action === 'CheckOut' ? new Date() : null),
            notes
          });
        } else {
          attendance.status = 'Present';
          if (manualCheckInTime) attendance.checkInTime = checkInDate;
          else if (action === 'CheckIn' && !attendance.checkInTime) attendance.checkInTime = new Date();

          if (manualCheckOutTime) attendance.checkOutTime = checkOutDate;
          else if (action === 'CheckOut' && !attendance.checkOutTime) attendance.checkOutTime = new Date();

          if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\\n' + notes : notes);
          await attendance.save();
        }
        break;

      case 'Absent':
        if (dayOff) await dayOff.destroy();
        if (!attendance) {
          await AttendanceLog.create({
            userId, shiftId, date: today, status: 'Absent', notes
          });
        } else {
          attendance.status = 'Absent';
          attendance.checkInTime = null;
          attendance.checkOutTime = null;
          if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\\n' + notes : notes);
          await attendance.save();
        }
        break;

      case 'DayOff':
        if (attendance) await attendance.destroy();
        if (!dayOff) {
          await DayOffRequest.create({
            userId, date: today, dayName, status: 'Approved', reason: 'إجازة مسجلة من الإدارة'
          });
        } else {
          dayOff.status = 'Approved';
          await dayOff.save();
        }
        break;

      default:
        return res.status(400).json({ error: 'إجراء غير صالح' });
    }

    res.json({ message: 'تم تحديث حالة الموظف بنجاح' });
  } catch (error) {
    console.error('Error in adminUpdateStatus:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
