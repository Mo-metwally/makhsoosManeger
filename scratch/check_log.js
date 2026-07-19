const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: '../server/database.sqlite', logging: false });
const AttendanceLog = require('../server/models/AttendanceLog')(sequelize, DataTypes);

async function check() {
  const log = await AttendanceLog.findByPk('ca609139-f18d-4cc4-8388-a7d251b8d29e');
  if (log) {
    console.log('Log exists:', log.toJSON());
  } else {
    console.log('Log DOES NOT exist!');
  }
}
check();
