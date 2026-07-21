const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  db.all("SELECT id, userId, date, status FROM AttendanceLogs WHERE date LIKE '2026-08%'", (err, rows) => {
    if (err) console.error(err);
    else console.log("Logs for August:", rows);
  });
});
db.close();
