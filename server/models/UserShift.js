const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserShift = sequelize.define('UserShift', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  isObserver: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = UserShift;
