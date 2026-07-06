const sequelize = require('../config/db');
const User = require('./User');
const CallReport = require('./CallReport');
const InactivityLog = require('./InactivityLog');
const PerformanceLog = require('./PerformanceLog');

// Relationships
User.hasMany(CallReport, { foreignKey: 'userId', onDelete: 'CASCADE' });
CallReport.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(InactivityLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
InactivityLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PerformanceLog, { foreignKey: 'userId', onDelete: 'CASCADE' });
PerformanceLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  CallReport,
  InactivityLog,
  PerformanceLog
};
