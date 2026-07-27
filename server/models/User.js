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
  jobTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cardUses: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  walletNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  walletType: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'E-Wallet'
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
  jwtVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tasks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resetOtp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resetOtpExpiry: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.JSON, // Use JSON for sqlite compatibility instead of JSONB
    defaultValue: []
  },
  isTrackerOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  trackerStatus: {
    type: DataTypes.ENUM('offline', 'active', 'idle'),
    defaultValue: 'offline'
  },
  baseSalary: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = User;
