require('dotenv').config();
const { CallReport } = require('./models');
const { Op } = require('sequelize');

async function check() {
  const calls = await CallReport.findAll({ 
    where: {
      createdAt: {
        [Op.gte]: new Date('2026-07-27')
      }
    },
    order: [['createdAt', 'DESC']]
  });
  console.log(`Found ${calls.length} calls since July 27th`);
  for (let c of calls) {
    console.log(c.phone, c.createdAt);
  }
  process.exit();
}
check();
