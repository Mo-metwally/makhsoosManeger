const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: '../server/database.sqlite', logging: false });
const Shift = require('../server/models/Shift')(sequelize, DataTypes);

async function check() {
  const shifts = await Shift.findAll();
  console.log(shifts.map(s => ({ name: s.name, start: s.startTime, end: s.endTime })));
}
check();
