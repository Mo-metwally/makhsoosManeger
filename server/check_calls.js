require('dotenv').config();
const { CallReport } = require('./models');

async function check() {
  const calls = await CallReport.findAll({ order: [['createdAt', 'DESC']], limit: 10 });
  for (let c of calls) {
    console.log(c.phone, c.createdAt);
  }
  process.exit();
}
check();
