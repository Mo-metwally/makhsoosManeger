const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const os = require('os');
require('dotenv').config();

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
const settingRoutes = require('./routes/settingRoutes');

const app = express();

const allowedOrigins = process.env.ALLOWLIST ? process.env.ALLOWLIST.split(',') : ['http://localhost:5173'];

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
app.use('/api/budgets', budgetRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/settings', settingRoutes);

// Serve frontend client
app.use(express.static(path.join(__dirname, 'public', 'dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;

const runAutoAbsentCheck = require('./services/autoAbsentService');
const runAutoSettleAdvances = require('./services/autoSettleAdvancesService');

const startServer = async () => {
  try {
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
      console.log(`======================================\n`);

      // Run automatic absent check immediately, then every 5 minutes
      // Start Auto Absent Check (Every 5 mins)
      runAutoAbsentCheck();
      setInterval(runAutoAbsentCheck, 5 * 60 * 1000);

      // Start Auto Settle Advances (Every 12 hours)
      runAutoSettleAdvances();
      setInterval(runAutoSettleAdvances, 12 * 60 * 60 * 1000);
    });
  } catch (err) {
    console.error('[ERROR] Unable to connect to the database:', err);
    process.exit(1);
  }
};

startServer();



