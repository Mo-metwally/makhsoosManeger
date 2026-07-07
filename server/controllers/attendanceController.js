const { AttendanceLog, Shift, User } = require('../models');
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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
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
    const today = new Date().toISOString().split('T')[0];
    
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
    const today = new Date().toISOString().split('T')[0];

    const log = await AttendanceLog.findOne({ where: { userId, date: today } });
    
    if (!log) {
      return res.status(404).json({ error: 'لم تقم بتسجيل الحضور اليوم لتتمكن من الانصراف' });
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
    res.json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
