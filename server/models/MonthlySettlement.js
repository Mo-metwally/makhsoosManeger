const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MonthlySettlement = sequelize.define('MonthlySettlement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    monthKey: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('Active', 'Settled'),
      defaultValue: 'Settled',
      allowNull: false
    },
    settledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'monthKey']
      }
    ]
  });

  return MonthlySettlement;
};
