const { Op, Sequelize } = require('sequelize');
const { getLogicalDate } = require('../utils/dateUtils');
const { CallReport, InactivityLog, PerformanceLog, User, AttendanceLog, DayOffRequest, Expense, Shift, AdvanceRequest, Setting } = require('../models');

// CALL REPORTS
const getCallReports = async (req, res) => {
  try {
    const reports = await CallReport.findAll({ 
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
};

const saveCallReports = async (req, res) => {
  try {
    const calls = req.body; // Array of calls
    // First, delete old ones for this user if we are doing a full replace
    // or just insert new ones. The frontend currently replaces or appends.
    // Let's implement an upsert or bulkCreate with updateOnDuplicate.
    
    // Using simple approach: just bulkCreate and ignore duplicates
    await CallReport.bulkCreate(calls.map(c => ({ 
      ...c, 
      userId: req.user.id,
      supervisorName: req.user.fullName || req.user.username 
    })), {
      updateOnDuplicate: ["callerName", "phone", "category", "notes", "date", "time", "supervisorName", "agentName", "city", "commMethod", "profileLink", "agentStatus", "report", "callStatus"]
    });
    
    res.json({ message: 'Calls saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save calls' });
  }
};

const deleteCallReport = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Call ID is required' });
    
    // Only allow admin or the owner to delete? For now, we'll just delete by ID.
    const deleted = await CallReport.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Call not found' });
    
    res.json({ message: 'Call deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete call' });
  }
};

const checkPhoneExists = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    const call = await CallReport.findOne({ where: { phone } });
    
    if (call) {
      return res.json({ exists: true, commMethod: call.commMethod });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Error checking phone:', error);
    res.status(500).json({ error: 'Failed to check phone number' });
  }
};

const getPhoneHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const history = await CallReport.findAll({ 
      where: { phone }, 
      order: [['createdAt', 'DESC']]
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching phone history:', error);
    res.status(500).json({ error: 'Failed to fetch phone history' });
  }
};

// INACTIVITY LOGS
const getInactivityLogs = async (req, res) => {
  try {
    const logs = await InactivityLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inactivity logs' });
  }
};

const saveInactivityLogs = async (req, res) => {
  try {
    const logs = req.body;
    await InactivityLog.bulkCreate(logs.map(l => ({ ...l, userId: req.user.id })), {
      updateOnDuplicate: ["type", "startTime", "endTime", "durationMs", "supervisorName"]
    });
    res.json({ message: 'Logs saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save logs' });
  }
};

// PERFORMANCE LOGS
const getPerformanceLogs = async (req, res) => {
  try {
    const logs = await PerformanceLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance logs' });
  }
};

const savePerformanceLog = async (req, res) => {
  try {
    const logData = req.body;
    const existingLog = await PerformanceLog.findOne({
      where: { userId: req.user.id, date: logData.date }
    });

    if (existingLog) {
      await existingLog.update({
        ...logData,
        supervisorName: req.user.fullName || req.user.username
      });
    } else {
      await PerformanceLog.create({
        ...logData,
        userId: req.user.id,
        supervisorName: req.user.fullName || req.user.username
      });
    }
    res.json({ message: 'Performance log saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save performance log' });
  }
};

// ADMIN ROUTES (View All)
const getAllData = async (req, res) => {
  try {
    // Only allow if user is admin, but for now just return all
    // In real app, add check: if (req.user.role !== 'Admin') ...
    const calls = await CallReport.findAll({
      include: [{ model: User, attributes: ['id', 'fullName', 'username', 'jobTitle'] }]
    });
    const inactivity = await InactivityLog.findAll({
      include: [{ model: User, attributes: ['id', 'fullName', 'username', 'jobTitle', 'avatar'] }],
      order: [['createdAt', 'DESC']]
    });
    const performance = await PerformanceLog.findAll();
    const expenses = await Expense.findAll({
      include: [{ model: User, attributes: ['id', 'fullName', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    const attendanceLogs = await AttendanceLog.findAll({
      include: [
        { model: User, attributes: ['id', 'fullName', 'username', 'jobTitle'] },
        { model: Shift }
      ],
      order: [['createdAt', 'DESC']]
    });

    const dayOffs = await DayOffRequest.findAll({
      where: { status: 'Approved' },
      include: [{ model: User, attributes: ['id', 'fullName', 'username'] }]
    });

    const dayOffLogs = dayOffs.map(d => ({
      id: d.id,
      userId: d.userId,
      date: d.date,
      status: 'DayOff',
      checkInTime: null,
      checkOutTime: null,
      User: d.User,
      notes: d.reason || 'إجازة مسجلة'
    }));

    const combinedAttendance = [...attendanceLogs.map(l => l.toJSON()), ...dayOffLogs].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date).getTime();
      const dateB = new Date(b.createdAt || b.date).getTime();
      return dateB - dateA;
    });

    const advances = await AdvanceRequest.findAll({
      where: { status: 'approved' },
      include: [{ model: User, as: 'Requester', attributes: ['id', 'fullName', 'username'] }]
    });

    res.json({
      calls,
      inactivity,
      performance,
      expenses,
      attendanceLogs: combinedAttendance,
      advances
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all data' });
  }
};

const getPersonalStats = async (req, res) => {
  try {
    let userId = req.user.id;
    // Allow admin/supervisor to view other users' stats
    if (req.query.employeeId && (req.user.role === 'Admin' || req.user.role === 'SuperAdmin')) {
      userId = req.query.employeeId;
    }
    
    // Fetch user details for header
    const targetUser = await User.findByPk(userId, { attributes: ['fullName', 'username'] });
    const userName = targetUser ? targetUser.fullName || targetUser.username : 'موظف غير معروف';

    const now = new Date();
    
    // 1. Process Date Filters
    const startDateQuery = req.query.startDate;
    const endDateQuery = req.query.endDate;
    
    const end = endDateQuery ? new Date(endDateQuery) : new Date();
    const start = startDateQuery ? new Date(startDateQuery) : new Date(end);
    
    const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - durationDays);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const startStr = getLogicalDate(start);
    const endStr = getLogicalDate(end);
    const prevStartStr = getLogicalDate(prevStart);
    const prevEndStr = getLogicalDate(prevEnd);

    // 2. Fetch Data based on periods
    // Calls
    const currentCalls = await CallReport.count({
      where: { userId, date: { [Op.between]: [startStr, endStr] } }
    });
    const previousCalls = await CallReport.count({
      where: { userId, date: { [Op.between]: [prevStartStr, prevEndStr] } }
    });

    // Inactivity / Breaks
    const currentInactivity = await InactivityLog.findAll({
      where: { 
        userId,
        startTime: {
          [Op.between]: [`${startStr}T00:00:00.000Z`, `${endStr}T23:59:59.999Z`]
        }
      }
    });
    const totalBreakMs = currentInactivity.reduce((acc, log) => acc + (log.durationMs || 0), 0);

    // Attendance
    const currentAttendance = await AttendanceLog.findAll({
      where: { userId, date: { [Op.between]: [startStr, endStr] } }
    });
    
    // Calculate Discipline Rate
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let totalCheckInMins = 0;
    let checkInDays = 0;

    currentAttendance.forEach(log => {
      if (log.status === 'Present') presentCount++;
      else if (log.status === 'Late') lateCount++;
      else if (log.status === 'Absent') absentCount++;

      if (log.checkInTime) {
        const ci = new Date(log.checkInTime);
        totalCheckInMins += (ci.getHours() * 60 + ci.getMinutes());
        checkInDays++;
      }
    });

    const totalAttendanceDays = presentCount + lateCount + absentCount;
    const disciplineRate = totalAttendanceDays > 0 ? Math.round((presentCount / totalAttendanceDays) * 100) : 100;
    
    // Determine Rating
    let disciplineRating = 'ممتاز';
    if (disciplineRate < 70) disciplineRating = 'ضعيف';
    else if (disciplineRate < 85) disciplineRating = 'جيد';
    else if (disciplineRate < 95) disciplineRating = 'جيد جداً';

    const avgCheckInMins = checkInDays > 0 ? Math.round(totalCheckInMins / checkInDays) : 0;
    const avgCheckInTime = avgCheckInMins > 0 ? `${String(Math.floor(avgCheckInMins / 60)).padStart(2, '0')}:${String(avgCheckInMins % 60).padStart(2, '0')}` : '--:--';

    // Previous Attendance (for comparison)
    const prevAttendance = await AttendanceLog.findAll({
      where: { userId, date: { [Op.between]: [prevStartStr, prevEndStr] } }
    });
    let prevCheckInMins = 0;
    let prevCheckInDays = 0;
    prevAttendance.forEach(log => {
      if (log.checkInTime) {
        const ci = new Date(log.checkInTime);
        prevCheckInMins += (ci.getHours() * 60 + ci.getMinutes());
        prevCheckInDays++;
      }
    });
    const prevAvgCheckInMins = prevCheckInDays > 0 ? Math.round(prevCheckInMins / prevCheckInDays) : 0;
    const prevAvgCheckInTime = prevAvgCheckInMins > 0 ? `${String(Math.floor(prevAvgCheckInMins / 60)).padStart(2, '0')}:${String(prevAvgCheckInMins % 60).padStart(2, '0')}` : '--:--';

    // Next Day Off (strictly after today)
    const todayActual = new Date();
    const todayStrActual = `${todayActual.getFullYear()}-${String(todayActual.getMonth() + 1).padStart(2, '0')}-${String(todayActual.getDate()).padStart(2, '0')}`;
    
    const nextDayOff = await DayOffRequest.findOne({
      where: { 
        userId, 
        status: 'Approved',
        date: { [Op.gt]: todayStrActual }
      },
      order: [['date', 'ASC']]
    });

    // Chart Data
    // Calls
    const allUserCalls = await CallReport.findAll({ where: { userId }, attributes: ['date'] });
    const callsByDate = {};
    allUserCalls.forEach(call => {
      if (call.date) callsByDate[call.date] = (callsByDate[call.date] || 0) + 1;
    });

    // Breaks
    const allUserBreaks = await InactivityLog.findAll({ where: { userId }});
    const breaksByDate = {}; // date -> total minutes
    allUserBreaks.forEach(b => {
      if (b.startTime) {
        try {
          const dStr = b.startTime.split('T')[0]; // Safe string split
          breaksByDate[dStr] = (breaksByDate[dStr] || 0) + Math.round((b.durationMs || 0) / 60000);
        } catch (e) {
          console.error("Error parsing break time:", b.startTime);
        }
      }
    });

    // Attendance (Hours Worked)
    const allUserAttendance = await AttendanceLog.findAll({ where: { userId }});
    const attendanceByDate = {}; // date -> total hours
    allUserAttendance.forEach(a => {
      if (a.date && a.checkInTime && a.checkOutTime) {
        const hours = (new Date(a.checkOutTime) - new Date(a.checkInTime)) / (1000 * 60 * 60);
        attendanceByDate[a.date] = hours > 0 ? parseFloat(hours.toFixed(2)) : 0;
      } else if (a.date) {
        attendanceByDate[a.date] = 0;
      }
    });

    const getLocalYYYYMMDD = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Generate arrays function
    const generateChartArrays = (dataMap) => {
      const daily = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(d.getDate() - i);
        const dStr = getLocalYYYYMMDD(d);
        daily.push({ name: d.toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' }), value: dataMap[dStr] || 0 });
      }

      const weekly = [];
      for (let i = 7; i >= 0; i--) {
        const weekEnd = new Date(end);
        weekEnd.setDate(weekEnd.getDate() - (i * 7));
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        let sum = 0;
        for(let j=0; j<7; j++) {
           const d = new Date(weekStart);
           d.setDate(d.getDate() + j);
           sum += (dataMap[getLocalYYYYMMDD(d)] || 0);
        }
        weekly.push({ name: `أسبوع ${8 - i}`, value: parseFloat(sum.toFixed(2)) });
      }

      const monthly = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(end);
        d.setMonth(d.getMonth() - i);
        const mYear = d.getFullYear();
        const mMonth = d.getMonth() + 1;
        let sum = 0;
        Object.keys(dataMap).forEach(dateStr => {
          const [y, m] = dateStr.split('-');
          if (parseInt(y) === mYear && parseInt(m) === mMonth) sum += dataMap[dateStr];
        });
        monthly.push({ name: d.toLocaleDateString('ar-EG', { month: 'short' }), value: parseFloat(sum.toFixed(2)) });
      }
      return { daily, weekly, monthly };
    };

    const callsChartData = generateChartArrays(callsByDate);
    const breaksChartData = generateChartArrays(breaksByDate);
    const attendanceChartData = generateChartArrays(attendanceByDate);

    res.json({
      user: {
        name: userName
      },
      period: { start: startStr, end: endStr, prevStart: prevStartStr, prevEnd: prevEndStr, durationDays },
      calls: {
        current: currentCalls,
        previous: previousCalls,
        diff: currentCalls - previousCalls
      },
      attendance: {
        disciplineRate,
        disciplineRating,
        avgCheckInTime,
        prevAvgCheckInTime,
        checkInDiffMins: avgCheckInMins - prevAvgCheckInMins
      },
      breaks: {
        totalMs: totalBreakMs,
        count: currentInactivity.length
      },
      nextDayOff: nextDayOff ? nextDayOff.date : null,
      chartData: callsChartData,
      breaksChartData,
      attendanceChartData
    });
  } catch (error) {
    console.error('Error fetching personal stats:', error);
    res.status(500).json({ error: 'Failed to fetch personal stats' });
  }
};

const getTrackerSettings = async (req, res) => {
  try {
    const defaultSettings = {
      idleThresholdMs: 300000,
      allowedIdleThresholdMs: 300000,
      checkIntervalMs: 1000,
      enableTracking: true
    };

    const settingsDb = await Setting.findAll({
      where: {
        key: ['tracker_idleThresholdMs', 'tracker_allowedIdleThresholdMs', 'tracker_checkIntervalMs', 'tracker_enable']
      }
    });

    const settingsMap = {};
    settingsDb.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    const settings = {
      idleThresholdMs: settingsMap['tracker_idleThresholdMs'] ? parseInt(settingsMap['tracker_idleThresholdMs']) : defaultSettings.idleThresholdMs,
      allowedIdleThresholdMs: settingsMap['tracker_allowedIdleThresholdMs'] ? parseInt(settingsMap['tracker_allowedIdleThresholdMs']) : defaultSettings.allowedIdleThresholdMs,
      checkIntervalMs: settingsMap['tracker_checkIntervalMs'] ? parseInt(settingsMap['tracker_checkIntervalMs']) : defaultSettings.checkIntervalMs,
      enableTracking: settingsMap['tracker_enable'] ? settingsMap['tracker_enable'] === 'true' : defaultSettings.enableTracking
    };

    res.json(settings);
  } catch (error) {
    console.error('Error fetching tracker settings:', error);
    res.status(500).json({ error: 'Failed to fetch tracker settings' });
  }
};

const updateTrackerStatus = async (req, res) => {
  try {
    require('fs').appendFileSync('tracker_debug.txt', new Date().toISOString() + ' RECV: ' + JSON.stringify(req.body) + '\n');
    let { status, idleSince } = req.body;
    
    if (typeof status === 'string') {
      status = status.toLowerCase();
      if (status === 'online') status = 'active';
      if (status === 'inactive' || status === 'away') status = 'idle';
    }

    if (!['active', 'idle', 'offline'].includes(status)) {
      console.log('Invalid status received:', req.body);
      return res.status(400).json({ error: 'Invalid status', received: status || 'undefined' });
    }

    req.user.trackerStatus = status;
    req.user.isTrackerOnline = (status !== 'offline');
    await req.user.save();

    if (status === 'idle') {
      // Check if employee is currently on a break (any open log that is not 'idle')
      const activeBreak = await InactivityLog.findOne({
        where: { 
          userId: req.user.id, 
          endTime: null,
          type: { [Op.notIn]: ['idle'] }
        }
      });

      if (!activeBreak) {
        // Find open idle log
        const openLog = await InactivityLog.findOne({
          where: { userId: req.user.id, type: 'idle', endTime: null }
        });
        if (!openLog) {
          await InactivityLog.create({
            id: require('crypto').randomUUID(),
            userId: req.user.id,
            type: 'idle',
            startTime: idleSince ? new Date(idleSince).toISOString() : new Date().toISOString(),
            supervisorName: req.user.fullName || req.user.username
          });
        }
      }
    } else if (status === 'active' || status === 'offline') {
      // Find open idle log and close it
      const openLog = await InactivityLog.findOne({
        where: { userId: req.user.id, type: 'idle', endTime: null }
      });
      
      if (openLog) {
        openLog.endTime = new Date().toISOString();
        openLog.durationMs = new Date(openLog.endTime).getTime() - new Date(openLog.startTime).getTime();
        await openLog.save();
      }
    }

    res.json({ success: true, trackerStatus: status });
  } catch (error) {
    console.error('Error updating tracker status:', error);
    res.status(500).json({ error: 'Failed to update tracker status' });
  }
};

module.exports = {
  getCallReports,
  saveCallReports,
  deleteCallReport,
  getInactivityLogs,
  saveInactivityLogs,
  getPerformanceLogs,
  savePerformanceLog,
  getAllData,
  getPersonalStats,
  checkPhoneExists,
  getPhoneHistory,
  getTrackerSettings,
  updateTrackerStatus
};
