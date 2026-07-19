const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './database.sqlite', logging: false });

const AttendanceLog = require('./models/AttendanceLog')(sequelize, DataTypes);
const DayOffRequest = require('./models/DayOffRequest')(sequelize, DataTypes);

async function fix() {
  const dayOffs = await DayOffRequest.findAll({
    where: { reason: 'إجازة مسجلة من الإدارة' }
  });
  
  for (const dayOff of dayOffs) {
    const existingLog = await AttendanceLog.findOne({
      where: { userId: dayOff.userId, date: dayOff.date }
    });
    
    if (!existingLog) {
      console.log(`Recreating AttendanceLog for user ${dayOff.userId} on ${dayOff.date}`);
      await AttendanceLog.create({
        id: 'ca609139-f18d-4cc4-8388-a7d251b8d29e', // Force the same ID so the UI doesn't freak out, or just let it generate a new one
        userId: dayOff.userId,
        shiftId: null, // We might not know it, let's leave null if allowed, or find the user's shift
        date: dayOff.date,
        status: 'DayOff'
      });
      console.log("Created successfully.");
    }
  }
}
fix();
