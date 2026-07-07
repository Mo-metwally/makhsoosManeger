require('dotenv').config();
const sequelize = require('./config/db');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Explicitly alter the column with the USING clause to cast existing string data to date
    await sequelize.query('ALTER TABLE "AttendanceLogs" ALTER COLUMN "date" TYPE DATE USING "date"::date;');
    console.log('Migration successful: column date cast to DATE.');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await sequelize.close();
  }
}

migrate();
