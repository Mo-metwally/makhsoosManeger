const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const InactivityLog = sequelize.define('InactivityLog', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  type: DataTypes.STRING,
  startTime: DataTypes.STRING,
  endTime: DataTypes.STRING,
  durationMs: DataTypes.INTEGER,
  supervisorName: DataTypes.STRING
});

module.exports = InactivityLog;
