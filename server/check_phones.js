require('dotenv').config();
const { CallReport } = require('./models');
const { Op } = require('sequelize');

async function checkPhones() {
  const calls = await CallReport.findAll({
    where: {
      phone: {
        [Op.like]: '%5%'
      }
    }
  });
  console.log(`Found ${calls.length} calls with 5.`);
  let countStartingWith5 = 0;
  for (let c of calls) {
    if (c.phone && c.phone.trim().startsWith('5')) {
      console.log('Starts with 5:', c.phone);
      countStartingWith5++;
      c.phone = '0' + c.phone.trim();
      await c.save();
    }
  }
  console.log(`Found and updated ${countStartingWith5} calls that start with 5 after trimming.`);
  process.exit();
}
checkPhones();
