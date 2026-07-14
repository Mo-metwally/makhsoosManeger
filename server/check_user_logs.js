require('dotenv').config();
const { User, AttendanceLog } = require('./models');

User.findOne({ where: { email: 'stf65410@gmail.com' } })
  .then(async u => { 
    if(!u) return console.log('User not found');
    console.log('User ID:', u.id, 'Status:', u.status);
    const logs = await AttendanceLog.findAll({ where: { userId: u.id } });
    console.log('Logs:');
    logs.forEach(l => console.log(l.toJSON()));
    process.exit(0);
  })
  .catch(e => { console.error(e); process.exit(1); });
