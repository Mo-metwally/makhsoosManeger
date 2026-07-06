const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PerformanceLog = sequelize.define('PerformanceLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  supervisorName: DataTypes.STRING,
  date: DataTypes.STRING,
  timestamp: DataTypes.STRING,
  tasks: DataTypes.TEXT,
  notesList: {
    type: DataTypes.TEXT,
    get() {
      const val = this.getDataValue('notesList');
      return val ? JSON.parse(val) : [];
    },
    set(val) {
      this.setDataValue('notesList', JSON.stringify(val));
    }
  },
  manualCallsCount: DataTypes.INTEGER
});

module.exports = PerformanceLog;
