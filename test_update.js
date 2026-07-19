const { AttendanceLog } = require('./server/models');
const sequelize = require('./server/config/db');

async function test() {
  await sequelize.authenticate();
  const log = await AttendanceLog.findByPk('f301544c-8b18-4c3f-8af4-9d1d556b1829');
  if (!log) {
    console.log('Log not found');
    return;
  }
  
  console.log('checkOutTime type:', typeof log.checkOutTime);
  console.log('checkOutTime value:', log.checkOutTime);
  console.log('Is Date?', log.checkOutTime instanceof Date);
  
  if (log.checkOutTime && typeof log.checkOutTime.getTime !== 'function') {
    console.log('getTime is not a function!');
  }
}
test().catch(console.error).finally(() => process.exit(0));
