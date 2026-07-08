const { CallReport, InactivityLog, PerformanceLog, User } = require('../models');

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
      updateOnDuplicate: ["callerName", "phone", "category", "notes", "date", "time", "supervisorName", "agentName", "city", "commMethod", "agentStatus", "report", "callStatus"]
    });
    
    res.json({ message: 'Calls saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save calls' });
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
    const calls = await CallReport.findAll();
    const inactivity = await InactivityLog.findAll({
      include: [{ model: User, attributes: ['id', 'fullName', 'username', 'jobTitle', 'avatar'] }],
      order: [['createdAt', 'DESC']]
    });
    const performance = await PerformanceLog.findAll();

    res.json({ calls, inactivity, performance });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save inactivity logs' });
  }
};

module.exports = {
  getCallReports,
  saveCallReports,
  getInactivityLogs,
  saveInactivityLogs,
  getPerformanceLogs,
  savePerformanceLog,
  getAllData
};
