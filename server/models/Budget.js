const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Budget = sequelize.define('Budget', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    monthKey: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Format: YYYY-MM'
    },
    totalBudget: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    openingBalance: {
      type: DataTypes.FLOAT,
      defaultValue: 0
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'monthKey']
      }
    ]
  });

  return Budget;
};
