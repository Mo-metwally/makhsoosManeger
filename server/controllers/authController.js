const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { User } = require('../models');
const { Op } = require('sequelize');
const { sendWelcomeEmail } = require('../utils/emailService');

// Normally we'd use bcrypt, but keeping it simple as this is an internal tool
// If password hashing is required, it can be added easily.

const login = async (req, res) => {
  const { username, password } = req.body;
  console.log(`[LOGIN ATTEMPT] username/email: "${username}", password: "${password}"`);
  
  if (!username) {
    return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني.' });
  }
  if (!password) {
    return res.status(400).json({ error: 'يرجى إدخال كلمة المرور.' });
  }

  try {
    const trimmedUsername = username.trim();
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: trimmedUsername },
          { email: trimmedUsername }
        ]
      } 
    });
    if (!user) {
      console.log(`[LOGIN FAILED] user not found`);
      return res.status(401).json({ error: 'هذا الحساب غير مسجل لدينا.' });
    }
    if (user.password !== password) {
      console.log(`[LOGIN FAILED] password mismatch`);
      return res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    }

    if (user.status === 'Pending Approval') {
      return res.status(403).json({ error: 'حسابك قيد المراجعة من الإدارة، يرجى الانتظار.' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'هذا الحساب موقوف، يرجى مراجعة الإدارة.' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Handle device tracking
    let deviceId = req.cookies.deviceId;
    if (!deviceId) {
      deviceId = uuidv4();
      res.cookie('deviceId', deviceId, { 
        httpOnly: true, 
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }

    res.cookie('token', token, { 
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ 
      message: 'تم تسجيل الدخول بنجاح', 
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        workingHours: user.workingHours,
        avatar: user.avatar,
        tasks: user.tasks,
        notes: user.notes
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'تم تسجيل الخروج' });
};

const me = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      name: req.user.name,
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      status: req.user.status,
      workingHours: req.user.workingHours,
      avatar: req.user.avatar,
      tasks: req.user.tasks,
      notes: req.user.notes
    }
  });
};

const updateProfile = async (req, res) => {
  try {
    const { name, fullName, email, phone, password, avatar, tasks, notes } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (password) user.password = password; // Only if they typed a new one
    if (avatar) user.avatar = avatar;
    if (tasks !== undefined) user.tasks = tasks;
    if (notes !== undefined) user.notes = notes;

    await user.save();
    res.json({ message: 'تم تحديث البيانات بنجاح', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطأ في تحديث البيانات' });
  }
}

const signup = async (req, res) => {
  const { username, password, fullName, email, phone } = req.body;
  
  // Basic validations
  if (!fullName || fullName.trim().length < 3) {
    return res.status(400).json({ error: 'يرجى إدخال الاسم الكامل بشكل صحيح (3 أحرف على الأقل).' });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'يرجى إدخال بريد إلكتروني صحيح.' });
  }
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ error: 'يرجى إدخال رقم هاتف صحيح.' });
  }
  if (!username || username.trim().length < 4 || /\s/.test(username)) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يتكون من 4 أحرف على الأقل وبدون مسافات.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن لا تقل عن 6 أحرف.' });
  }

  try {
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: username.trim() },
          { email: email.trim() }
        ]
      } 
    });
    
    if (existingUser) {
      if (existingUser.username === username.trim()) {
        return res.status(400).json({ error: 'اسم المستخدم مسجل مسبقاً، يرجى اختيار اسم آخر.' });
      } else {
        return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً، يرجى استخدام بريد آخر.' });
      }
    }

    const newUser = await User.create({
      username,
      password,
      fullName,
      email,
      phone,
      status: 'Pending Approval', // Default
      role: 'Supervisor' // Default role
    });

    // Send the beautiful email asynchronously
    if (email) {
      sendWelcomeEmail(email, fullName);
    }

    res.status(201).json({ message: 'تم التسجيل بنجاح، بانتظار موافقة الإدارة.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
  }
};

module.exports = {
  login,
  logout,
  me,
  updateProfile,
  signup
};
