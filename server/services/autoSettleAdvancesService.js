const { AdvanceRequest } = require('../models');
const { Op } = require('sequelize');

const runAutoSettleAdvances = async () => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${currentYear}-${currentMonth}`;

    const advancesToSettle = await AdvanceRequest.findAll({
      where: {
        status: 'approved',
        monthKey: {
          [Op.lt]: currentMonthKey
        }
      }
    });

    for (const adv of advancesToSettle) {
      adv.status = 'settled';
      await adv.save();
      console.log(`[AutoSettle] Settled advance ${adv.id} from ${adv.monthKey}`);
    }
  } catch (error) {
    console.error('Error running auto settle advances:', error);
  }
};

module.exports = runAutoSettleAdvances;
