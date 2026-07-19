require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './database.sqlite', logging: false });
const AttendanceLog = require('./models/AttendanceLog')(sequelize, DataTypes);
const User = require('./models/User')(sequelize, DataTypes);
AttendanceLog.belongsTo(User, { foreignKey: 'userId' });

async function check() {
  const logs = await AttendanceLog.findAll({
    order: [['createdAt', 'DESC']],
    limit: 5,
    include: [{ model: User, attributes: ['username'] }]
  });
  console.log("Recent logs:");
  logs.forEach(l => {
    console.log(`User: ${l.User?.username}, Date: ${l.date}, CheckIn: ${l.checkInTime}, Status: ${l.status}, CreatedAt: ${l.createdAt}`);
  });
}
check();
