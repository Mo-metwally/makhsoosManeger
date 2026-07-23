const { User, Shift, AttendanceLog, Setting } = require('../models');

// Logical date is now standardized to midnight (00:00) across the entire application
const getLogicalDateStr = (dateInput = new Date()) => {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const runAutoAbsentCheck = async () => {
  try {
    const now = new Date();
    
    // Fetch autoCheckout setting
    const autoCheckoutSetting = await Setting.findOne({ where: { key: 'autoCheckoutHours' } });
    const autoCheckoutHours = autoCheckoutSetting ? parseFloat(autoCheckoutSetting.value) || 1 : 1;
    const autoCheckoutMs = autoCheckoutHours * 60 * 60 * 1000;

    // Get all users who have a shift assigned
    const users = await User.findAll({
      include: [{ model: Shift }]
    });

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const datesToCheck = [
      getLogicalDateStr(yesterday), // Check yesterday's logical date
      getLogicalDateStr(now)        // Check today's logical date
    ];

    for (const user of users) {
      if (!user.Shifts || user.Shifts.length === 0) continue;
      
      const shift = user.Shifts[0];
      if (!shift.startTime || !shift.endTime) continue;
      if (shift.UserShift && shift.UserShift.isObserver) continue; // Skip observers

      const { startTime, endTime } = shift;
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const crossesMidnight = endHour < startHour;

      for (const logicalDateStr of datesToCheck) {
        const [year, month, day] = logicalDateStr.split('-').map(Number);
        
        // Build the absolute end time for the shift on this logical date
        const shiftEndDate = new Date(year, month - 1, day, endHour, endMin, 0);

        if (crossesMidnight) {
          shiftEndDate.setDate(shiftEndDate.getDate() + 1); // Ends on the next calendar day
        }

        // If the current time has passed the shift's end time
        if (now > shiftEndDate) {
          // Check if an attendance log exists for this user and logical date
          const existingLog = await AttendanceLog.findOne({
            where: {
              userId: user.id,
              date: logicalDateStr
            }
          });

          // If no log exists (no check-in, no DayOff), mark as Absent automatically
          if (!existingLog) {
            await AttendanceLog.create({
              userId: user.id,
              shiftId: shift.id,
              date: logicalDateStr,
              status: 'Absent'
            });
            console.log(`[AutoAbsent] Marked user ${user.username} as Absent for ${logicalDateStr}`);
          } 
          // If log exists, they checked in but forgot to check out
          else if (existingLog.status === 'Present' && existingLog.checkInTime && !existingLog.checkOutTime) {
            const thresholdTime = new Date(shiftEndDate.getTime() + autoCheckoutMs);
            if (now > thresholdTime) {
              existingLog.checkOutTime = shiftEndDate;
              await existingLog.save();
              console.log(`[AutoAbsent] Auto-closed shift for ${user.username} on ${logicalDateStr} at ${shiftEndDate}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[AutoAbsent] Error running auto absent check:', error);
  }
};

module.exports = runAutoAbsentCheck;
