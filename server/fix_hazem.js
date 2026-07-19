require('dotenv').config();
const { User, AttendanceLog } = require('./models');
const { Op } = require('sequelize');

async function fix() {
  const users = await User.findAll({
    where: { username: { [Op.like]: '%hazem%' } }
  });
  
  if (users.length === 0) {
    console.log("No user found with 'hazem'");
    return;
  }
  
  const user = users[0];
  console.log("Found user:", user.username);
  
  const log = await AttendanceLog.findOne({
    where: { userId: user.id, date: '2026-07-19' },
    order: [['createdAt', 'DESC']]
  });
  
  if (log) {
    log.date = '2026-07-20';
    log.checkOutTime = null;
    await log.save();
    console.log(`Fixed log for ${user.username} to 2026-07-20 and re-opened it.`);
  } else {
    console.log("Log not found on 2026-07-19.");
  }
}
fix();
