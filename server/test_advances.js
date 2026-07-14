require('dotenv').config();
const { CallReport, InactivityLog, PerformanceLog, User, AttendanceLog, DayOffRequest, Expense, Shift, AdvanceRequest } = require('./models');

async function testQuery() {
  try {
    const advances = await AdvanceRequest.findAll({
      where: { status: 'approved' },
      include: [{ model: User, as: 'Requester', attributes: ['id', 'fullName', 'username'] }]
    });
    console.log("Advances fetched successfully:", advances.length);
  } catch (err) {
    console.error("Error fetching Advances:", err.message);
  }
}
testQuery();
