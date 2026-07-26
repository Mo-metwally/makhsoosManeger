const { AttendanceLog, Shift, User, DayOffRequest, InactivityLog, PerformanceLog, Setting } = require('../models');
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
    
    const unclosedLog = await AttendanceLog.findOne({
      where: { userId, checkInTime: { [Op.not]: null }, checkOutTime: null },
      include: [{ model: Shift, attributes: ['name', 'startTime', 'endTime'] }]
    });

    // Find a log from today
    const todayLog = await AttendanceLog.findOne({
      where: { userId, date: today },
      include: [{ model: Shift, attributes: ['name', 'startTime', 'endTime'] }]
    });

    const dayOff = await DayOffRequest.findOne({
      where: { userId, date: today, status: 'Approved' }
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
      shift: activeShift,
      isDayOff: !!dayOff,
      trackerStatus: req.user.trackerStatus
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
    
    // Handle existing DayOff or Absent
    let dayOff = await DayOffRequest.findOne({ where: { userId, date: today } });
    if (dayOff) {
      await dayOff.destroy();
    }

    const existingLog = await AttendanceLog.findOne({ where: { userId, date: today } });
    if (existingLog) {
      if (existingLog.status === 'Absent') {
        existingLog.status = 'Present';
        existingLog.checkInTime = new Date();
        await existingLog.save();
        return res.status(201).json({ message: 'تم تسجيل الحضور بنجاح', log: existingLog });
      }
      return res.status(400).json({ error: 'لقد قمت بتسجيل الحضور مسبقاً لهذا اليوم' });
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[new Date().getDay()];

    let activeShift = await getActiveShiftForDay(userId, dayName);
    
    // If they bypass the day-off blockage, allow them to check in to their first available shift
    if (!activeShift && req.body.isDayOffWork) {
      const user = await User.findByPk(userId, { include: [Shift] });
      if (user && user.Shifts && user.Shifts.length > 0) {
        activeShift = user.Shifts[0];
      }
    }

    if (!activeShift) {
      return res.status(400).json({ error: 'ليس لديك وردية عمل مخصصة لهذا اليوم' });
    }

    // Server time for check-in
    const checkInTime = new Date();

    const log = await AttendanceLog.create({
      userId,
      shiftId: activeShift.id,
      date: today,
      checkInTime,
      status: req.body.isDayOffWork ? 'DayOffWork' : 'Present'
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

    // Verify if PerformanceLog exists for today
    const hasSummary = await PerformanceLog.findOne({
      where: { userId, date: today }
    });

    if (!hasSummary) {
      return res.status(400).json({ error: 'يجب تسجيل ملخص المهام للدوام قبل تسجيل الانصراف' });
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
    const { monthKey } = req.query;
    let whereClause = {};
    if (monthKey) {
      whereClause.date = { [Op.startsWith]: monthKey };
    }

    const logs = await AttendanceLog.findAll({
      where: whereClause,
      include: [
        { model: Shift },
        { model: User, attributes: ['id', 'fullName', 'username', 'jobTitle'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });



    const inactivityLogs = await InactivityLog.findAll(
      monthKey ? { where: { startTime: { [Op.startsWith]: monthKey } } } : {}
    );
    const breakMap = {}; // Key: "userId-YYYY-MM-DD"

    inactivityLogs.forEach(log => {
      if (!log.startTime) return;
      const dateStr = log.startTime.split('T')[0];
      const key = `${log.userId}-${dateStr}`;
      
      if (!breakMap[key]) {
        breakMap[key] = { 'بريك صلاة': 0, 'بريك غداء': 0 };
      }
      if (log.type === 'بريك صلاة' || log.type === 'بريك غداء') {
        breakMap[key][log.type] += Math.floor((log.durationMs || 0) / 60000);
      }
    });

    const resultLogs = logs.map(log => {
      const logData = log.toJSON();
      const key = `${log.userId}-${log.date}`;
      logData.breakDetails = breakMap[key] || { 'بريك صلاة': 0, 'بريك غداء': 0 };
      return logData;
    });

    let dayOffWhereClause = { status: 'Approved' };
    if (monthKey) {
      dayOffWhereClause.date = { [Op.startsWith]: monthKey };
    }

    const dayOffs = await DayOffRequest.findAll({
      where: dayOffWhereClause,
      include: [{ model: User, attributes: ['id', 'fullName', 'username', 'jobTitle'] }]
    });

    const dayOffLogs = dayOffs
      .filter(d => !resultLogs.some(log => log.userId === d.userId && log.date === d.date))
      .map(d => ({
      id: d.id,
      userId: d.userId,
      date: d.date,
      status: 'DayOff',
      checkInTime: null,
      checkOutTime: null,
      User: d.User,
      Shift: null,
      breakDetails: { 'بريك صلاة': 0, 'بريك غداء': 0 },
      notes: d.reason || 'إجازة مسجلة'
    }));

    const allCombined = [...resultLogs, ...dayOffLogs].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    });

    res.json(allCombined);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.registerAbsence = async (req, res) => {
  try {
    const { userId, date, notes } = req.body;
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
    
    const log = await AttendanceLog.create({
      userId,
      shiftId: shiftId || null,
      date,
      status: 'Absent',
      notes
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
    if (req.user.role === 'SuperAdmin') {
      const allShifts = await Shift.findAll({
        include: [{ 
          model: User, 
          through: { attributes: [] },
          where: { role: ['Admin', 'SuperAdmin'] },
          attributes: ['fullName'],
          required: false
        }]
      });
      adminShifts = allShifts.map(s => ({
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        admins: s.Users && s.Users.length > 0 ? s.Users.map(u => u.fullName).join(' و ') : 'لا يوجد مسؤول'
      }));
    } else if (adminUser && adminUser.Shifts) {
      adminShifts = adminUser.Shifts.map(s => ({
        name: s.name,
        startTime: s.startTime,
        endTime: s.endTime,
        admins: adminUser.fullName
      }));
    }

    // Get all users
    const usersInShifts = await User.findAll({
      include: [
        { 
          model: Shift, 
          through: { attributes: ['isObserver'] },
          required: false
        }
      ],
      where: {
        status: 'Active',
        role: ['SuperAdmin', 'Admin', 'Supervisor']
      },
      attributes: ['id', 'fullName', 'username', 'avatar', 'jobTitle', 'role']
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

    // Get today's performance logs (summaries)
    const { PerformanceLog } = require('../models');
    const performanceLogs = await PerformanceLog.findAll({
      where: { date: today }
    });
    const summaryMap = {};
    const callsMap = {};
    performanceLogs.forEach(p => {
      summaryMap[p.userId] = true;
      callsMap[p.userId] = p.manualCallsCount || 0;
    });

    // Fetch Settings
    const settings = await Setting.findAll();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    const allowedLunchBreakMinutes = parseInt(settingsMap['allowedLunchBreakMinutes'] || '30', 10);
    const allowedPrayerBreakMinutes = parseInt(settingsMap['allowedPrayerBreakMinutes'] || '15', 10);
    const allowedEarlyDepartureMinutes = parseInt(settingsMap['allowedEarlyDepartureMinutes'] || '0', 10);

    const attendanceMap = {};
    attendances.forEach(a => {
      attendanceMap[a.userId] = {
        status: a.status || (a.checkOutTime ? 'CheckedOut' : 'Present'),
        checkInTime: a.checkInTime,
        checkOutTime: a.checkOutTime,
        notes: a.notes
      };
    });

    const dayoffMap = {};
    dayoffs.forEach(d => {
      dayoffMap[d.userId] = { status: 'DayOff', reason: d.reason };
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
      if (!log.endTime || log.endTime === 'null' || log.endTime === '') {
        activeBreakMap[log.userId] = log.type;
      }

      if (!breakMap[log.userId]) {
        breakMap[log.userId] = { 'بريك صلاة': 0, 'بريك غداء': 0 };
      }
      if (log.type === 'بريك صلاة' || log.type === 'بريك غداء') {
        breakMap[log.userId][log.type] += Math.floor((log.durationMs || 0) / 60000);
      }
    });

    // Combine data
    const result = usersInShifts.map(user => {
      let todayStatus = 'Pending'; // Default: Not attended yet
      let checkInTime = null;
      let checkOutTime = null;
      
      if (attendanceMap[user.id]) {
        todayStatus = attendanceMap[user.id].status || 'Present';
        if (attendanceMap[user.id].checkOutTime && attendanceMap[user.id].status !== 'BusinessTrip') {
          todayStatus = 'CheckedOut';
        }
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
           if (diff > 0) lateMinutes += diff;
        }
      }

      let earlyDepartureMinutes = 0;
      if (checkOutTime && user.Shifts.length > 0 && attendanceMap[user.id] && attendanceMap[user.id].status !== 'BusinessTrip') {
        const shift = user.Shifts[0];
        if (shift.startTime && shift.endTime) {
           const checkOutDate = new Date(checkOutTime);
           const [sh, sm] = shift.startTime.split(':').map(Number);
           const [eh, em] = shift.endTime.split(':').map(Number);
           
           const shiftEnd = new Date(`${today}T00:00:00`);
           shiftEnd.setHours(eh, em, 0, 0);
           if (eh < sh) {
             shiftEnd.setDate(shiftEnd.getDate() + 1);
           }
           
           if (checkOutDate < shiftEnd) {
             const diffMins = Math.floor((shiftEnd - checkOutDate) / 60000);
             const actualEarlyMins = diffMins - allowedEarlyDepartureMinutes;
             if (actualEarlyMins > 0) earlyDepartureMinutes += actualEarlyMins;
           }
        }
      }

      // Add break overages to lateMinutes
      const userBreaks = breakMap[user.id] || { 'بريك صلاة': 0, 'بريك غداء': 0 };
      if (userBreaks['بريك غداء'] > allowedLunchBreakMinutes) {
        lateMinutes += (userBreaks['بريك غداء'] - allowedLunchBreakMinutes);
      }
      if (userBreaks['بريك صلاة'] > allowedPrayerBreakMinutes) {
        lateMinutes += (userBreaks['بريك صلاة'] - allowedPrayerBreakMinutes);
      }

      return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatar: user.avatar,
        jobTitle: user.jobTitle,
        role: user.role,
        shifts: user.Shifts.map(s => s.name),
        isObserver: user.Shifts.some(s => s.UserShift && s.UserShift.isObserver),
        todayStatus,
        checkInTime,
        checkOutTime,
        lateMinutes,
        earlyDepartureMinutes,
        notes: attendanceMap[user.id] ? attendanceMap[user.id].notes : (dayoffMap[user.id] ? dayoffMap[user.id].reason : ''),
        breakDetails: breakMap[user.id] || { 'بريك صلاة': 0, 'بريك غداء': 0 },
        hasSummary: !!summaryMap[user.id],
        callsCount: callsMap[user.id] || 0
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
      if (timeString.includes('T')) return new Date(timeString);
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

    if (!shiftId && !['DayOff', 'BusinessTrip', 'Absent'].includes(action)) {
      return res.status(400).json({ error: 'الموظف غير مرتبط بوردية' });
    }

    // Find existing logs
    let attendance = await AttendanceLog.findOne({ where: { userId, date: today } });
    let dayOff = await DayOffRequest.findOne({ where: { userId, date: today } });

    switch (action) {
      case 'CheckIn':
      case 'CheckOut':
      case 'EditTimes':
      case 'DayOffWork':
        if (dayOff) await dayOff.destroy();
        if (!attendance) {
          await AttendanceLog.create({
            userId, shiftId, date: today, status: action === 'DayOffWork' ? 'DayOffWork' : 'Present', 
            checkInTime: checkInDate || (action === 'CheckIn' || action === 'DayOffWork' ? new Date() : null),
            checkOutTime: checkOutDate || (action === 'CheckOut' ? new Date() : null),
            notes
          });
        } else {
          attendance.status = action === 'DayOffWork' ? 'DayOffWork' : 'Present';
          if (manualCheckInTime) attendance.checkInTime = checkInDate;
          else if ((action === 'CheckIn' || action === 'DayOffWork') && !attendance.checkInTime) attendance.checkInTime = new Date();

          if (manualCheckOutTime) attendance.checkOutTime = checkOutDate;
          else if (action === 'CheckOut' && !attendance.checkOutTime) attendance.checkOutTime = new Date();

          if (attendance.checkInTime && attendance.checkOutTime && attendance.checkOutTime < attendance.checkInTime) {
            attendance.checkOutTime = new Date(attendance.checkOutTime.getTime() + 24 * 60 * 60 * 1000);
          }

          if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\n' + notes : notes);
          await attendance.save();
        }
        break;

      case 'Absent':
      case 'BusinessTrip':
        if (dayOff) await dayOff.destroy();
        if (!attendance) {
          await AttendanceLog.create({
            userId, shiftId, date: today, status: action, notes
          });
        } else {
          attendance.status = action;
          attendance.checkInTime = null;
          attendance.checkOutTime = null;
          if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\n' + notes : notes);
          await attendance.save();
        }
        break;

      case 'DayOff':
        if (!attendance) {
          await AttendanceLog.create({
            userId, shiftId, date: today, status: 'DayOff', notes
          });
        } else {
          attendance.status = 'DayOff';
          attendance.checkInTime = null;
          attendance.checkOutTime = null;
          if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\n' + notes : notes);
          await attendance.save();
        }
        
        if (!dayOff) {
          await DayOffRequest.create({
            userId, date: today, dayName, status: 'Approved', reason: 'إجازة مسجلة من الإدارة'
          });
        } else {
          dayOff.status = 'Approved';
          await dayOff.save();
        }
        break;

      case 'ResetCheckout':
        if (!attendance) {
           return res.status(404).json({ error: 'لم يتم العثور على سجل حضور لليوم' });
        }
        attendance.checkOutTime = null;
        if (notes) attendance.notes = (attendance.notes ? attendance.notes + '\\n' + notes : notes);
        await attendance.save();
        break;

      default:
        return res.status(400).json({ error: 'إجراء غير صالح' });
    }

    res.json({ message: 'تم تحديث حالة الموظف بنجاح' });
  } catch (error) {
    require('fs').writeFileSync('error_log.txt', String(error.stack));
    console.error('Error in adminUpdateStatus:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};

exports.updateLogTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, notes } = req.body;

    const log = await AttendanceLog.findByPk(id);
    if (!log) {
      return res.status(404).json({ error: 'لم يتم العثور على السجل' });
    }

    const getValidDate = (timeString, baseDateString) => {
      if (!timeString) return null;
      if (timeString.includes('T')) return new Date(timeString);
      return new Date(`${baseDateString}T${timeString}:00`);
    };

    if (checkInTime !== undefined) {
      log.checkInTime = getValidDate(checkInTime, log.date);
    }
    
    if (checkOutTime !== undefined) {
      log.checkOutTime = getValidDate(checkOutTime, log.date);
    }
    
    if (status) {
      log.status = status;
      if (status === 'Absent' || status === 'DayOffWork' || status === 'DayOff' || status === 'BusinessTrip') {
        log.checkInTime = null;
        log.checkOutTime = null;
      }
    }

    if (log.checkInTime && log.checkOutTime && new Date(log.checkOutTime) < new Date(log.checkInTime)) {
      log.checkOutTime = new Date(new Date(log.checkOutTime).getTime() + 24 * 60 * 60 * 1000);
    }

    if (notes !== undefined) {
      log.notes = notes;
    }

    await log.save();
    res.json({ message: 'تم تحديث أوقات السجل بنجاح', log });
  } catch (error) {
    require('fs').writeFileSync('update_error_log.txt', String(error.stack));
    console.error('Error in updateLogTime:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
};
