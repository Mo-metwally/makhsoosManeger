const { Shift, User, AttendanceLog, DayOffRequest, CallReport } = require('../models');
const { Op } = require('sequelize');

exports.createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, workingDays, dayOffType, fixedDaysOff, variableDaysOffCount, baseSalary } = req.body;
    const newShift = await Shift.create({
      name,
      startTime,
      endTime,
      workingDays,
      dayOffType,
      fixedDaysOff,
      variableDaysOffCount,
      baseSalary
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
    const { name, startTime, endTime, workingDays, dayOffType, fixedDaysOff, variableDaysOffCount, baseSalary } = req.body;
    
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
      variableDaysOffCount,
      baseSalary
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
        attributes: ['id', 'fullName', 'username', 'role', 'avatar', 'jobTitle', 'baseSalary']
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
    const { timeframe = 'monthly' } = req.query; // 'today', 'yesterday', 'weekly', 'monthly', 'yearly'
    
    const shift = await Shift.findByPk(id, {
      include: [
        {
          model: User,
          attributes: ['id', 'fullName', 'username', 'role', 'avatar', 'jobTitle', 'baseSalary'],
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
    const currentDay = now.getDate();
    
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = currentYear - 1;
    }

    // Calculate shift hours
    let shiftHoursPerDay = 8;
    if (shift.startTime && shift.endTime) {
      const [sh, sm] = shift.startTime.split(':').map(Number);
      const [eh, em] = shift.endTime.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        let diff = eh + em / 60 - (sh + sm / 60);
        if (diff < 0) diff += 24;
        shiftHoursPerDay = diff;
      }
    }

    let aggregatedStats = {
      currentMonth: { totalHours: 0, totalCalls: 0, totalPresent: 0, totalAbsent: 0, totalDayOffs: 0, totalLate: 0 },
      previousMonth: { totalHours: 0, totalCalls: 0, totalPresent: 0, totalAbsent: 0, totalDayOffs: 0, totalLate: 0 }
    };

    // Helper to check if a date belongs to the current/prev period based on timeframe
    const isInPeriod = (d, isPrev = false) => {
      const diffTime = now - d;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (timeframe === 'today') {
        const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const prevStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000 - 86400000).toISOString().split('T')[0];
        const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return isPrev ? dStr === prevStr : dStr === todayStr;
      }
      if (timeframe === 'yesterday') {
        const yestStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000 - 86400000).toISOString().split('T')[0];
        const prevYestStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000 - 86400000 * 2).toISOString().split('T')[0];
        const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        return isPrev ? dStr === prevYestStr : dStr === yestStr;
      }
      if (timeframe === 'weekly') {
        return isPrev ? (diffDays > 6 && diffDays <= 13) : (diffDays >= 0 && diffDays <= 6);
      }
      if (timeframe === 'yearly') {
        return isPrev ? d.getFullYear() === prevYear : d.getFullYear() === currentYear;
      }
      // monthly (default)
      return isPrev 
        ? (d.getMonth() === prevMonth && d.getFullYear() === prevYear) 
        : (d.getMonth() === currentMonth && d.getFullYear() === currentYear);
    };

    // Helper to generate time series buckets
    const generateBuckets = () => {
      let buckets = [];
      if (timeframe === 'today' || timeframe === 'yesterday') {
        // Hourly buckets (0 to 23)
        for (let i = 0; i < 24; i++) {
          buckets.push({ hour: i, name: `${i}:00` });
        }
      } else if (timeframe === 'weekly') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          buckets.push({ date: new Date(d), name: d.toLocaleDateString('ar-EG', { weekday: 'short' }) });
        }
      } else if (timeframe === 'yearly') {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        for (let i = 0; i < 12; i++) {
          buckets.push({ month: i, name: months[i] });
        }
      } else {
        // Monthly (1 to 31)
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          buckets.push({ day: i, name: i.toString() });
        }
      }
      return buckets.map(b => ({
        ...b,
        currentCalls: 0, currentHours: 0, currentPresent: 0, currentTotalDays: 0,
        prevCalls: 0, prevHours: 0, prevPresent: 0, prevTotalDays: 0
      }));
    };

    let chartData = generateBuckets();

    const getBucketIndex = (dateObj, isPrev = false) => {
      if (timeframe === 'today' || timeframe === 'yesterday') {
        return dateObj.getHours();
      } else if (timeframe === 'weekly') {
        const diffTime = Math.abs(now - dateObj);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (!isPrev && diffDays <= 6) return 6 - diffDays;
        if (isPrev && diffDays > 6 && diffDays <= 13) return 13 - diffDays;
        return -1;
      } else if (timeframe === 'yearly') {
        const m = dateObj.getMonth();
        const y = dateObj.getFullYear();
        if (!isPrev && y === currentYear) return m;
        if (isPrev && y === prevYear) return m;
        return -1;
      } else {
        // Monthly
        const m = dateObj.getMonth();
        const y = dateObj.getFullYear();
        const d = dateObj.getDate();
        if (!isPrev && y === currentYear && m === currentMonth) return d - 1;
        if (isPrev && y === prevYear && m === prevMonth) return d - 1;
        return -1;
      }
    };

    const usersWithStats = shift.Users.map(user => {
      const attendanceLogs = user.AttendanceLogs || [];
      const dayOffRequests = user.DayOffRequests || [];
      const callReports = user.CallReports || [];

      // Dynamic stats for current period (based on timeframe)
      const currPeriodLogs = attendanceLogs.filter(log => isInPeriod(new Date(log.date), false));
      const currPeriodDayOffs = dayOffRequests.filter(req => isInPeriod(new Date(req.date), false) && req.status === 'Approved');
      const currPeriodCalls = callReports.filter(call => isInPeriod(new Date(call.createdAt), false));

      // Dynamic stats for previous period (based on timeframe)
      const prevPeriodLogs = attendanceLogs.filter(log => isInPeriod(new Date(log.date), true));
      const prevPeriodDayOffs = dayOffRequests.filter(req => isInPeriod(new Date(req.date), true) && req.status === 'Approved');
      const prevPeriodCalls = callReports.filter(call => isInPeriod(new Date(call.createdAt), true));

      // Populate time series buckets
      const populateBuckets = (logs, dayOffs, calls, isPrev) => {
        logs.forEach(log => {
          if (!isInPeriod(new Date(log.date), isPrev)) return;
          const d = new Date(log.date);
          const idx = getBucketIndex(d, isPrev);
          if (idx >= 0 && idx < chartData.length) {
            if (log.status === 'Present') {
              if (isPrev) { chartData[idx].prevPresent++; chartData[idx].prevHours += shiftHoursPerDay; }
              else { chartData[idx].currentPresent++; chartData[idx].currentHours += shiftHoursPerDay; }
            }
            if (isPrev) chartData[idx].prevTotalDays++;
            else chartData[idx].currentTotalDays++;
          }
        });

        dayOffs.forEach(req => {
           if(req.status !== 'Approved' || !isInPeriod(new Date(req.date), isPrev)) return;
           const d = new Date(req.date);
           const idx = getBucketIndex(d, isPrev);
           if (idx >= 0 && idx < chartData.length) {
              if (isPrev) chartData[idx].prevTotalDays++;
              else chartData[idx].currentTotalDays++;
           }
        });

        calls.forEach(call => {
           if (!isInPeriod(new Date(call.createdAt), isPrev)) return;
           const d = new Date(call.createdAt);
           const idx = getBucketIndex(d, isPrev);
           if (idx >= 0 && idx < chartData.length) {
              if (isPrev) chartData[idx].prevCalls++;
              else chartData[idx].currentCalls++;
           }
        });
      };

      populateBuckets(attendanceLogs, dayOffRequests, callReports, false);
      populateBuckets(attendanceLogs, dayOffRequests, callReports, true);

      // User stats for current period
      const presentDays = currPeriodLogs.filter(l => l.status === 'Present' || l.checkInTime != null).length;
      const absentDays = currPeriodLogs.filter(l => l.status === 'Absent').length;
      
      let lateDays = 0;
      let totalLateMinutes = 0;
      currPeriodLogs.forEach(l => {
        if (l.checkInTime && shift.startTime) {
           const checkIn = new Date(l.checkInTime);
           const [sh, sm] = shift.startTime.split(':').map(Number);
           const expected = new Date(checkIn);
           expected.setHours(sh, sm, 0, 0);
           const diff = Math.floor((checkIn - expected) / 60000);
           if (diff > 0) {
             totalLateMinutes += diff;
             lateDays += 1;
           }
        }
      });

      const approvedDayOffs = currPeriodDayOffs.length;
      const totalCalls = currPeriodCalls.length;
      const totalDuration = currPeriodCalls.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
      aggregatedStats.currentMonth.totalPresent += presentDays;
      aggregatedStats.currentMonth.totalAbsent += absentDays;
      aggregatedStats.currentMonth.totalLate += lateDays;
      aggregatedStats.currentMonth.totalDayOffs += approvedDayOffs;
      aggregatedStats.currentMonth.totalCalls += totalCalls;
      aggregatedStats.currentMonth.totalHours += (presentDays * shiftHoursPerDay);

      // User stats for previous period
      const prevPresent = prevPeriodLogs.filter(l => l.status === 'Present' || l.checkInTime != null).length;
      const prevAbsent = prevPeriodLogs.filter(l => l.status === 'Absent').length;
      let prevLate = 0;
      prevPeriodLogs.forEach(l => {
        if (l.checkInTime && shift.startTime) {
           const checkIn = new Date(l.checkInTime);
           const [sh, sm] = shift.startTime.split(':').map(Number);
           const expected = new Date(checkIn);
           expected.setHours(sh, sm, 0, 0);
           const diff = Math.floor((checkIn - expected) / 60000);
           if (diff > 0) prevLate += 1;
        }
      });
      const prevDayOffs = prevPeriodDayOffs.length;
      
      aggregatedStats.previousMonth.totalPresent += prevPresent;
      aggregatedStats.previousMonth.totalAbsent += prevAbsent;
      aggregatedStats.previousMonth.totalLate += prevLate;
      aggregatedStats.previousMonth.totalDayOffs += prevDayOffs;
      aggregatedStats.previousMonth.totalCalls += prevPeriodCalls.length;
      aggregatedStats.previousMonth.totalHours += (prevPresent * shiftHoursPerDay);

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
          totalLateMinutes,
          approvedDayOffs,
          totalCalls,
          totalDuration
        }
      };
    });

    const finalChartData = chartData.map(c => {
      const currRatio = c.currentTotalDays > 0 ? Math.round((c.currentPresent / c.currentTotalDays) * 100) : 0;
      const prevRatio = c.prevTotalDays > 0 ? Math.round((c.prevPresent / c.prevTotalDays) * 100) : 0;
      return {
        name: c.name,
        'المكالمات الحالية': c.currentCalls,
        'المكالمات السابقة': c.prevCalls,
        'الساعات الحالية': c.currentHours,
        'الساعات السابقة': c.prevHours,
        'الحضور الحالي': currRatio,
        'الحضور السابق': prevRatio
      };
    });

    res.json({ 
      shift: { id: shift.id, name: shift.name, workingDays: shift.workingDays, fixedDaysOff: shift.fixedDaysOff, dayOffType: shift.dayOffType, variableDaysOffCount: shift.variableDaysOffCount }, 
      users: usersWithStats,
      aggregatedStats,
      chartData: finalChartData
    });
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
