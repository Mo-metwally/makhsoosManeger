const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Expense = sequelize.define('Expense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('advance', 'supplies'),
      allowNull: false
    },
    employeeName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    item: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    monthKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    budgetId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Budgets',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  });

  return Expense;
};
