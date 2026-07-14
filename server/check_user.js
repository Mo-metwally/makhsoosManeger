require('dotenv').config();
const { User, Shift, AttendanceLog } = require('./models');

User.findOne({ where: { email: 'stf65410tt@gmail.com' }, include: [Shift] })
  .then(async u => { 
    console.log('User:', u ? u.toJSON() : 'Not Found'); 
    if(u) {
      const logs = await AttendanceLog.findAll({ where: { userId: u.id } });
      console.log('Logs:', logs.map(x=>x.toJSON()));
    }
    process.exit(0);
  })
  .catch(e => { console.error(e); process.exit(1); });
