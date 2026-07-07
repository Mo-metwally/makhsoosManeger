const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { sequelize, User } = require('./models');
const authRoutes = require('./routes/authRoutes');
const dataRoutes = require('./routes/dataRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Validate database connection
    await sequelize.authenticate();
    console.log('[INFO] Database connection has been established successfully.');

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
      console.log(`[INFO] Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[ERROR] Unable to connect to the database:', err);
    process.exit(1);
  }
};

startServer();



