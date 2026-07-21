const { AttendanceLog, User, AdvanceRequest } = require('./models');
const { Op } = require('sequelize');
async function run() {
  const logs = await AttendanceLog.findAll({ where: { date: { [Op.startsWith]: '2026-08' } } });
  console.log("AUGUST LOGS:", logs.map(l => l.toJSON()));
}
run().catch(console.error);
