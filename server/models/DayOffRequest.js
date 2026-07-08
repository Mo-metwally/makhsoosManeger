const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DayOffRequest = sequelize.define('DayOffRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING, // YYYY-MM-DD
    allowNull: false
  },
  dayName: {
    type: DataTypes.STRING, // e.g., 'Monday'
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
    allowNull: false
  }
});

module.exports = DayOffRequest;
