const sequelize = require('../config/db');
const User = require('./User');
const CallReport = require('./CallReport');
const InactivityLog = require('./InactivityLog');
const PerformanceLog = require('./PerformanceLog');
const Notification = require('./Notification');
const Shift = require('./Shift');
const AttendanceLog = require('./AttendanceLog');
const DayOffRequest = require('./DayOffRequest');

// Relationships
User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(CallReport, { foreignKey: 'userId', onDelete: 'CASCADE' });
CallReport.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(InactivityLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
InactivityLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PerformanceLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
PerformanceLog.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(Shift, { through: 'UserShifts', foreignKey: 'userId' });
Shift.belongsToMany(User, { through: 'UserShifts', foreignKey: 'shiftId' });

User.hasMany(AttendanceLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
AttendanceLog.belongsTo(User, { foreignKey: 'userId' });

Shift.hasMany(AttendanceLog, { foreignKey: 'shiftId', onDelete: 'CASCADE' });
AttendanceLog.belongsTo(Shift, { foreignKey: 'shiftId' });

User.hasMany(DayOffRequest, { foreignKey: 'userId', onDelete: 'CASCADE' });
DayOffRequest.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  CallReport,
  InactivityLog,
  PerformanceLog,
  Notification,
  Shift,
  AttendanceLog,
  DayOffRequest
};
