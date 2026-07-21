require('dotenv').config();
const { Sequelize, Op } = require('sequelize');
const sequelize = require('./config/db');
const { AttendanceLog, DayOffRequest } = require('./models');

async function fixDatabase() {
  try {
    console.log("Checking for duplicate AttendanceLogs...");
    const logs = await AttendanceLog.findAll({
      order: [['createdAt', 'DESC']]
    });

    const seen = new Set();
    let deletedCount = 0;

    for (const log of logs) {
      const key = `${log.userId}-${log.date}`;
      if (seen.has(key)) {
        // Duplicate found! Delete the older one.
        console.log(`Deleting duplicate log for user ${log.userId} on date ${log.date}`);
        await log.destroy();
        deletedCount++;
      } else {
        seen.add(key);
      }
    }
    console.log(`Deleted ${deletedCount} duplicate AttendanceLogs.`);

    console.log("Checking for duplicate DayOffRequests...");
    const requests = await DayOffRequest.findAll({
      order: [['createdAt', 'DESC']]
    });

    const seenRequests = new Set();
    let deletedReqCount = 0;

    for (const req of requests) {
      const key = `${req.userId}-${req.date}`;
      if (seenRequests.has(key)) {
        console.log(`Deleting duplicate DayOffRequest for user ${req.userId} on date ${req.date}`);
        await req.destroy();
        deletedReqCount++;
      } else {
        seenRequests.add(key);
      }
    }
    console.log(`Deleted ${deletedReqCount} duplicate DayOffRequests.`);

  } catch (error) {
    console.error("Error fixing database:", error);
  } finally {
    process.exit(0);
  }
}

fixDatabase();
