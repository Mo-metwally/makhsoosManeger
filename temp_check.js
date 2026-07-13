require('dotenv').config({ path: './server/.env' });
const sequelize = require('./server/config/db');
const InactivityLog = require('./server/models/InactivityLog');

async function check() {
  try {
    await sequelize.authenticate();
    const logs = await InactivityLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      raw: true
    });
    console.log("Inactivity Logs:");
    console.dir(logs);
  } catch (error) {
    console.error(error);
  } finally {
    process.exit();
  }
}
check();
