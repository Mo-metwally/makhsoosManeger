const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceLog = sequelize.define('AttendanceLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  shiftId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  date: {
    type: DataTypes.STRING, // YYYY-MM-DD
    allowNull: false
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Present', 'Absent', 'Late', 'DayOffWork', 'DayOff', 'BusinessTrip'),
    defaultValue: 'Present',
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = AttendanceLog;
