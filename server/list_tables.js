const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    console.log(rows);
    if(rows.find(r => r.name === 'AttendanceLogs')) {
       db.all("SELECT id, userId, date, status FROM AttendanceLogs", (err, r) => console.log(r));
    }
  });
});
db.close();
