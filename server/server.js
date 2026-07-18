const { verifyLicense } = require('./utils/licenseChecker');
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const os = require('os');

// Handle graceful shutdown and ignore EPIPE
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE') {
    return; // Ignore EPIPE errors
  }
  console.error('Uncaught Exception:', err);
});

const gracefulShutdown = () => {
  console.log('\n[INFO] Shutting down gracefully...');
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const { sequelize, User } = require('./models');
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dayOffRoutes = require('./routes/dayOffRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const advanceRoutes = require('./routes/advanceRoutes');
const salaryAdjustmentRoutes = require('./routes/salaryAdjustmentRoutes');
// const backupRoutes = require('./routes/backupRoutes');
const settingRoutes = require('./routes/settingRoutes');

const app = express();

const allowedOrigins = process.env.ALLOWLIST ? process.env.ALLOWLIST.split(',') : ['http://localhost:5173'];
if (process.env.BASE_URL && !allowedOrigins.includes(process.env.BASE_URL)) {
  allowedOrigins.push(process.env.BASE_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dayoff', dayOffRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/salary-adjustments', salaryAdjustmentRoutes);
// app.use('/api/backup', backupRoutes);
app.use('/api/settings', settingRoutes);

// Determine the path to the frontend dist folder
const fs = require('fs');
let distPath = path.join(__dirname, 'public', 'dist');

// If running as a compiled pkg executable
if (process.pkg) {
  const externalDistPath = path.join(path.dirname(process.execPath), 'public', 'dist');
  // Check if the public folder exists next to the .exe
  if (fs.existsSync(externalDistPath)) {
    distPath = externalDistPath;
  }
}

// Serve frontend client
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found. Make sure the public/dist folder exists.');
  }
});

const PORT = process.env.PORT || 5000;

const runAutoAbsentCheck = require('./services/autoAbsentService');
const runAutoSettleAdvances = require('./services/autoSettleAdvancesService');

const startServer = async () => {
  try {
    // التحقق من الرخصة (يتطلب إنترنت للوقت)
    await verifyLicense();

    // Validate database connection
    await sequelize.authenticate();
    const dbName = sequelize.config.database || process.env.DB_NAME || 'Unknown';
    console.log(`[INFO] Database connection has been established successfully. [DB: ${dbName}]`);

    await sequelize.sync({ alter: true });
    console.log('[INFO] Database synced');

    // Create SuperAdmin if not exists
    const superAdminUsername = process.env.SUPERADMIN_USERNAME || 'admin';
    const existingSuperAdmin = await User.findOne({ where: { username: superAdminUsername } });

    if (!existingSuperAdmin) {
      await User.create({
        username: superAdminUsername,
        password: process.env.SUPERADMIN_PASSWORD || 'password123',
        fullName: 'المدير العام',
        email: process.env.SUPERADMIN_EMAIL || 'admin@makhsoos.com',
        phone: '01000000000',
        role: 'SuperAdmin',
        status: 'Active',
        workingHours: 8,
        avatar: 'Crown'
      });
      console.log(`[INFO] SuperAdmin account created successfully (${superAdminUsername})`);
    } else {
      console.log(`[INFO] SuperAdmin account already exists.`);
    }

    app.listen(PORT, () => {
      const interfaces = os.networkInterfaces();
      let networkIP = 'localhost';
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            networkIP = iface.address;
            break;
          }
        }
        if (networkIP !== 'localhost') break;
      }

      console.log(`\n======================================`);
      console.log(`[INFO] Server running successfully!`);
      console.log(`> Local:   http://localhost:${PORT}`);
      console.log(`> Network: http://${networkIP}:${PORT}`);
      if (process.env.TSILSCALE_DOMAIN || process.env.TAILSCALE_DOMAIN) {
        console.log(`> Domain:  ${process.env.TSILSCALE_DOMAIN || process.env.TAILSCALE_DOMAIN}`);
      }
      if (process.env.BASE_URL) {
        console.log(`> Custom:  ${process.env.BASE_URL}`);
      }
      console.log(`> Allowed: ${allowedOrigins.join(', ')}`);
      console.log(`======================================\n`);

      // Run automatic absent check immediately, then every 5 minutes
      // Start Auto Absent Check (Every 5 mins)
      runAutoAbsentCheck();
      setInterval(runAutoAbsentCheck, 5 * 60 * 1000);

      // Start Auto Settle Advances (Every 12 hours)
      runAutoSettleAdvances();
      setInterval(runAutoSettleAdvances, 12 * 60 * 60 * 1000);

      // Start License Check (Scheduled for Midnight Egypt Time, using Google's Time)
      const scheduleLicenseCheck = () => {
        const scheduleNext = (trueTime) => {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Cairo',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
          });
          
          const parts = formatter.formatToParts(trueTime);
          const getPart = (type) => parseInt(parts.find(p => p.type === type).value, 10);
          
          const cYear = getPart('year');
          const cMonth = getPart('month') - 1;
          const cDay = getPart('day');
          const cHour = getPart('hour');
          const cMinute = getPart('minute');
          const cSecond = getPart('second');

          const cairoNow = Date.UTC(cYear, cMonth, cDay, cHour === 24 ? 0 : cHour, cMinute, cSecond);
          const cairoMidnight = Date.UTC(cYear, cMonth, cDay + 1, 0, 0, 0);
          
          let msToMidnight = cairoMidnight - cairoNow;
          if (msToMidnight <= 0) msToMidnight += 24 * 60 * 60 * 1000; // safety

          setTimeout(() => {
            verifyLicense(true).catch(err => {
              console.error('[SYSTEM PROTECTION] Automatic license check failed:', err);
              process.exit(1);
            });
            // Re-schedule for next midnight
            scheduleLicenseCheck();
          }, msToMidnight);
        };

        const https = require('https');
        https.request({ method: 'HEAD', host: 'google.com', port: 443, path: '/' }, (res) => {
          if (res.headers.date) {
            scheduleNext(new Date(res.headers.date));
          } else {
            scheduleNext(new Date());
          }
        }).on('error', () => {
          scheduleNext(new Date()); // Fallback to local time if no internet
        }).end();
      };
      
      scheduleLicenseCheck();
    });
  } catch (err) {
    console.error('[ERROR] Unable to connect to the database:', err);
    process.exit(1);
  }
};

startServer();



