const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('SuperAdmin', 'Admin', 'Supervisor'),
    defaultValue: 'Supervisor'
  },
  workingHours: {
    type: DataTypes.INTEGER, // e.g., 8
    defaultValue: 8
  },
  status: {
    type: DataTypes.ENUM('Pending Approval', 'Active', 'Suspended'),
    defaultValue: 'Pending Approval'
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: 'User'
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: true // For deviceLock
  },
  tasks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.JSON, // Use JSON for sqlite compatibility instead of JSONB
    defaultValue: []
  }
});

module.exports = User;
