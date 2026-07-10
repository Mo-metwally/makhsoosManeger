require('dotenv').config();
const { User, Budget, Shift, Expense } = require('./models');

async function test() {
  try {
    const users = await User.findAll({
      where: {
        role: ['Admin', 'SuperAdmin']
      },
      include: [
        {
          model: Budget,
          where: { monthKey: '2026-07' },
          required: false
        },
        {
          model: Shift,
          through: { attributes: [] },
          required: false
        },
        {
          model: Expense,
          where: { monthKey: '2026-07' },
          required: false
        }
      ]
    });
    console.log("Success! Users count:", users.length);
  } catch (err) {
    console.error("Query Error:", err.message);
  }
  process.exit(0);
}

test();
