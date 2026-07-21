const http = require('http');

http.get('http://localhost:5000/api/attendance/all-logs?monthKey=2026-08', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      const logs = JSON.parse(data);
      console.log('Number of logs:', logs.length);
      console.log('Sample log:', logs[0]);
    } else {
      console.log('Error:', data);
    }
  });
}).on('error', console.error);
