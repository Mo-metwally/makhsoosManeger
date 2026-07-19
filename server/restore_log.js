const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT * FROM AttendanceLogs WHERE id = 'ca609139-f18d-4cc4-8388-a7d251b8d29e'", [], (err, rows) => {
  if (err) {
    console.error(err);
    return;
  }
  if (rows.length === 0) {
    console.log("Log not found, searching DayOffRequests for same day...");
    db.all("SELECT * FROM DayOffRequests", [], (err, dayOffs) => {
      console.log("Day Offs:", dayOffs);
    });
  } else {
    console.log("Log exists:", rows);
  }
});
