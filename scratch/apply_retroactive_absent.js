require('dotenv').config({ path: __dirname + '/../server/.env' });
const { sequelize, User, Shift, AttendanceLog } = require('../server/models');

const getLogicalDateStr = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const run = async () => {
  try {
    await sequelize.authenticate();
    const now = new Date();
    
    // Find earliest user date
    const firstUser = await User.findOne({ order: [['createdAt', 'ASC']] });
    if (!firstUser) {
      console.log('No users found.');
      return process.exit();
    }
    
    let globalStartDate = new Date(firstUser.createdAt);
    
    const users = await User.findAll({ include: [{ model: Shift }] });
    let addedCount = 0;
    
    // Iterate from globalStartDate to today
    for (let d = new Date(globalStartDate); d <= now; d.setDate(d.getDate() + 1)) {
      const logicalDateStr = getLogicalDateStr(d);
      const [year, month, day] = logicalDateStr.split('-').map(Number);
      const currentIterDate = new Date(year, month - 1, day);
      
      for (const user of users) {
        if (!user.Shift || !user.Shift.startTime || !user.Shift.endTime) continue;
        if (user.role === 'Admin') continue;
        
        // Don't mark absent before the user was even created
        const userStartDate = new Date(user.createdAt);
        const userStartDayOnly = new Date(userStartDate.getFullYear(), userStartDate.getMonth(), userStartDate.getDate());
        if (currentIterDate < userStartDayOnly) continue;
        
        const { startTime, endTime } = user.Shift;
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const crossesMidnight = endHour < startHour;
        
        const shiftEndDate = new Date(year, month - 1, day, endHour, endMin, 0);
        if (crossesMidnight) shiftEndDate.setDate(shiftEndDate.getDate() + 1);
        
        // Only mark absent if the shift has actually ended relative to NOW
        if (now > shiftEndDate) {
          const existingLog = await AttendanceLog.findOne({
            where: { userId: user.id, date: logicalDateStr }
          });
          
          if (!existingLog) {
            await AttendanceLog.create({
              userId: user.id,
              shiftId: user.Shift.id,
              date: logicalDateStr,
              status: 'Absent'
            });
            addedCount++;
            console.log(`[+] Added Absent for ${user.username} on ${logicalDateStr}`);
          }
        }
      }
    }
    
    console.log(`Done. Successfully added ${addedCount} retroactive absent records.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
};

run();
