const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Shift = sequelize.define('Shift', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  startTime: {
    type: DataTypes.STRING, // e.g., "09:00"
    allowNull: false
  },
  endTime: {
    type: DataTypes.STRING, // e.g., "17:00"
    allowNull: false
  },
  workingDays: {
    type: DataTypes.JSON, // Array of days, e.g., ["Monday", "Tuesday"]
    allowNull: false,
    defaultValue: []
  },
  dayOffType: {
    type: DataTypes.STRING, // 'Fixed' or 'Variable'
    allowNull: false,
    defaultValue: 'Fixed'
  },
  fixedDaysOff: {
    type: DataTypes.JSON, // Array of days, e.g., ["Friday", "Saturday"]
    allowNull: true,
    defaultValue: []
  },
  variableDaysOffCount: {
    type: DataTypes.INTEGER, // Number of days allowed per month
    allowNull: true,
    defaultValue: 0
  }
});

module.exports = Shift;
