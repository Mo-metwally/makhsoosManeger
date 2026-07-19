const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: '../server/database.sqlite', logging: false });
const AttendanceLog = require('../server/models/AttendanceLog')(sequelize, DataTypes);

async function test() {
  const log = await AttendanceLog.findOne();
  if (!log) return console.log('No logs found');
  console.log('Original status:', log.status);
  
  log.status = 'DayOffWork';
  log.checkInTime = null;
  log.checkOutTime = null;
  
  try {
    await log.save();
    console.log('Saved successfully');
  } catch(e) {
    console.log('Error saving:', e.message);
  }
}
test();
