const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: 'server/database.sqlite', logging: false });
const AttendanceLog = require('./server/models/AttendanceLog')(sequelize, Sequelize.DataTypes);

async function check() {
  const logs = await AttendanceLog.findAll({
    order: [['date', 'DESC']],
    limit: 10
  });
  console.log(logs.map(l => ({ id: l.id, date: l.date, status: l.status, checkIn: l.checkInTime, checkOut: l.checkOutTime })));
}
check();
