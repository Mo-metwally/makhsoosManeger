require('dotenv').config();
const sequelize = require('./config/db');

async function drop() {
  try {
    await sequelize.authenticate();
    await sequelize.query('DROP TABLE IF EXISTS "AttendanceLogs" CASCADE;');
    console.log('Table dropped successfully.');
  } catch (error) {
    console.error('Error dropping table:', error);
  } finally {
    await sequelize.close();
  }
}

drop();
