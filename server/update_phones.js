require('dotenv').config();
const { CallReport } = require('./models');
const { Op } = require('sequelize');

async function updatePhones() {
  try {
    const calls = await CallReport.findAll({
      where: {
        phone: {
          [Op.like]: '1%'
        }
      }
    });

    console.log(`Found ${calls.length} calls starting with 1.`);

    let updatedCount = 0;
    for (const call of calls) {
      if (call.phone && call.phone.startsWith('1')) {
        call.phone = '0' + call.phone;
        await call.save();
        updatedCount++;
      }
    }
    console.log(`Successfully updated ${updatedCount} calls.`);
  } catch (err) {
    console.error('Error updating phones:', err);
  } finally {
    process.exit(0);
  }
}

updatePhones();
