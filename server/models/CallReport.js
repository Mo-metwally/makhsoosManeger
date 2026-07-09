const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CallReport = sequelize.define('CallReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  callerName: DataTypes.STRING,
  phone: DataTypes.STRING,
  category: DataTypes.STRING,
  notes: DataTypes.TEXT,
  date: DataTypes.STRING,
  time: DataTypes.STRING,
  supervisorName: DataTypes.STRING, // Might keep this for legacy reasons
  agentName: DataTypes.STRING,
  city: DataTypes.STRING,
  commMethod: DataTypes.STRING,
  profileLink: DataTypes.STRING,
  agentStatus: DataTypes.STRING,
  report: DataTypes.TEXT,
  callStatus: DataTypes.STRING,
});

module.exports = CallReport;
