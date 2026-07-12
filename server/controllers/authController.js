const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { User } = require('../models');

// Configure Nodemailer Transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
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

    // Note: Pending users are now allowed to login but handled by the frontend.
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'هذا الحساب موقوف، يرجى مراجعة الإدارة.' });
    }

    // Handle device tracking FIRST before generating JWT so we can update jwtVersion if needed
    let deviceId = req.cookies.deviceId;
    if (!deviceId) {
      deviceId = uuidv4();
      res.cookie('deviceId', deviceId, { 
        httpOnly: true, 
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }

    // Check if this user is trying to log in from a NEW device
    if (user.role !== 'SuperAdmin' && user.deviceId && user.deviceId !== deviceId) {
      user.status = 'Pending Approval';
      user.deviceId = null;
      user.jwtVersion = (user.jwtVersion || 0) + 1; // Log out the old device immediately
      await user.save();
    }

    // Generate JWT (using potentially updated jwtVersion)
    const token = jwt.sign({ id: user.id, role: user.role, version: user.jwtVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Handle device tracking
    // Cookies already handled above

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
        jobTitle: user.jobTitle,
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

const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        // If user is NOT a SuperAdmin, force re-approval and invalidate all sessions upon logout
        if (user && user.role !== 'SuperAdmin') {
          user.status = 'Pending Approval';
          user.deviceId = null;
          user.jwtVersion = (user.jwtVersion || 0) + 1;
          await user.save();
        }
      } catch (err) {
        // Ignore token errors during logout
      }
    }
  } catch (error) {
    console.error('Logout error:', error);
  }

  res.clearCookie('token');
  res.clearCookie('deviceId');
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
      jobTitle: req.user.jobTitle,
      role: req.user.role,
      status: req.user.status,
      workingHours: req.user.workingHours,
      avatar: req.user.avatar,
      tasks: req.user.tasks,
      notes: req.user.notes
    }
  });
};

const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username is required' });
    
    const existing = await User.findOne({ where: { username } });
    if (existing) {
      return res.json({ available: false });
    }
    return res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error checking username' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, fullName, email, phone, jobTitle, password, avatar, tasks, notes, username } = req.body;
    const user = req.user;

    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({ error: 'اسم المستخدم مسجل بالفعل.' });
      }
      user.username = username;
    }

    if (name) user.name = name;
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
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
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    // Plaintext compare (as per existing logic)
    if (user.password !== oldPassword) {
      return res.status(400).json({ error: 'كلمة المرور القديمة غير صحيحة.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.' });
    }

    user.password = newPassword;
    user.jwtVersion += 1; // Invalidate all existing sessions for security
    await user.save();

    res.json({ message: 'تم تغيير كلمة المرور بنجاح. سيتم تسجيل خروجك من الأجهزة الأخرى.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
};

const signup = async (req, res) => {
  const { username, password, fullName, email, phone, jobTitle } = req.body;
  
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
      jobTitle,
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

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ error: 'لم يتم العثور على حساب بهذا البريد الإلكتروني' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.resetOtp = otp;
    user.resetOtpExpiry = expiry;
    await user.save();

    // Send Email
    const mailOptions = {
      from: `"نظام مخصوص" <${process.env.FROM_EMAIL}>`,
      to: user.email,
      subject: 'رمز استعادة كلمة المرور',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 10px;">
          <h2>طلب استعادة كلمة المرور</h2>
          <p>أهلاً بك <strong>${user.fullName}</strong>،</p>
          <p>لقد طلبنا إعادة تعيين كلمة المرور الخاصة بك. يرجى استخدام الرمز التالي (صالح لمدة 15 دقيقة):</p>
          <h1 style="color: #3b82f6; letter-spacing: 5px; background: #fff; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h1>
          <p>إذا لم تطلب ذلك، يمكنك تجاهل هذا البريد بأمان.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'تم إرسال رمز التأكيد إلى بريدك الإلكتروني بنجاح.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء معالجة الطلب.' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: 'الرمز غير صحيح' });
    }
    if (new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: 'انتهت صلاحية الرمز، يرجى طلب رمز جديد.' });
    }

    res.json({ message: 'تم التحقق من الرمز بنجاح.' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء التحقق.' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    if (!user.resetOtp || user.resetOtp !== otp || new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: 'جلسة غير صالحة، يرجى إعادة محاولة طلب الرمز.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة ضعيفة جداً.' });
    }

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.jwtVersion = (user.jwtVersion || 0) + 1; // Force logout across devices
    await user.save();

    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث كلمة المرور.' });
  }
};

module.exports = {
  login,
  logout,
  me,
  updateProfile,
  signup,
  forgotPassword,
  verifyOtp,
  resetPassword,
  changePassword,
  checkUsername
};
