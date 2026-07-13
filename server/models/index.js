const sequelize = require('../config/db');
const User = require('./User');
const CallReport = require('./CallReport');
const InactivityLog = require('./InactivityLog');
const PerformanceLog = require('./PerformanceLog');
const Notification = require('./Notification');
const Shift = require('./Shift');
const AttendanceLog = require('./AttendanceLog');
const DayOffRequest = require('./DayOffRequest');
const Budget = require('./Budget')(sequelize);
const Expense = require('./Expense')(sequelize);
const AdvanceRequest = require('./AdvanceRequest')(sequelize);
const Setting = require('./Setting');

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

User.hasMany(Budget, { foreignKey: 'userId', onDelete: 'CASCADE' });
Budget.belongsTo(User, { foreignKey: 'userId' });

Budget.hasMany(Expense, { foreignKey: 'budgetId', onDelete: 'CASCADE' });
Expense.belongsTo(Budget, { foreignKey: 'budgetId' });

User.hasMany(Expense, { foreignKey: 'userId', onDelete: 'CASCADE' });
Expense.belongsTo(User, { foreignKey: 'userId' });

// AdvanceRequest Associations
User.hasMany(AdvanceRequest, { as: 'MyAdvances', foreignKey: 'userId', onDelete: 'CASCADE' });
AdvanceRequest.belongsTo(User, { as: 'Requester', foreignKey: 'userId' });

User.hasMany(AdvanceRequest, { as: 'ApprovedAdvances', foreignKey: 'adminId', onDelete: 'SET NULL' });
AdvanceRequest.belongsTo(User, { as: 'Approver', foreignKey: 'adminId' });

module.exports = {
  sequelize,
  User,
  CallReport,
  InactivityLog,
  PerformanceLog,
  Notification,
  Shift,
  AttendanceLog,
  DayOffRequest,
  Budget,
  Expense,
  AdvanceRequest,
  Setting
};
