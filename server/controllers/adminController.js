const { User, CallReport } = require('../models');
const { sendActivationEmail } = require('../utils/emailService');

// Middleware to check admin role
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'عفواً، لا تملك صلاحيات لدخول هذه الصفحة.' });
  }
  next();
};

const getPendingUsers = async (req, res) => {
  try {
    const users = await User.findAll({ where: { status: 'Pending Approval' } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب المستخدمين المعلقين' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
  }
};

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    user.status = 'Active';
    await user.save();
    
    // Send email asynchronously if they have an email
    if (user.email) {
      // Typically you'd use a frontend URL from an env var, using localhost:5173 for now
      const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173/login';
      sendActivationEmail(user.email, user.fullName, loginUrl);
    }

    res.json({ message: 'تم الموافقة على الحساب بنجاح', user });
  } catch (error) {
    res.status(500).json({ error: 'خطأ أثناء الموافقة' });
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    user.status = 'Suspended';
    // Optionally clear deviceId when suspending so they can't login anywhere
    user.deviceId = null;
    await user.save();
    res.json({ message: 'تم إيقاف الحساب', user });
  } catch (error) {
    res.status(500).json({ error: 'خطأ أثناء الإيقاف' });
  }
};

const changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    // Security check: Only SuperAdmin can create/modify SuperAdmins
    if ((role === 'SuperAdmin' || user.role === 'SuperAdmin') && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'صلاحيات المدير العام مطلوبة' });
    }

    user.role = role;
    await user.save();
    res.json({ message: 'تم تحديث الصلاحية بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ أثناء تحديث الصلاحية' });
  }
};

const getAllCalls = async (req, res) => {
  try {
    const calls = await CallReport.findAll();
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب المكالمات' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { fullName, username, email, phone, jobTitle, cardUses } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    user.fullName = fullName;
    user.username = username;
    user.email = email;
    user.phone = phone;
    if (jobTitle !== undefined) user.jobTitle = jobTitle;
    if (cardUses !== undefined) user.cardUses = cardUses;

    await user.save();
    res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user });
  } catch (error) {
    res.status(500).json({ error: 'خطأ أثناء تحديث بيانات المستخدم' });
  }
};

const unlockDevice = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    user.deviceId = null;
    user.jwtVersion = (user.jwtVersion || 0) + 1;
    await user.save();
    res.json({ message: 'تم مسح ارتباط الجهاز بنجاح', user });
  } catch (error) {
    res.status(500).json({ error: 'خطأ أثناء فك الارتباط بالجهاز' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

    // Ensure SuperAdmins can only be deleted by SuperAdmins
    if (user.role === 'SuperAdmin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'صلاحيات المدير العام مطلوبة لحذف هذا الحساب' });
    }
    
    // Prevent deleting oneself here to be safe
    if (user.id === req.user.id) {
       return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
    }

    await user.destroy();
    res.json({ message: 'تم حذف الحساب بنجاح' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'خطأ أثناء حذف الحساب' });
  }
};

module.exports = {
  isAdmin,
  getPendingUsers,
  getAllUsers,
  approveUser,
  suspendUser,
  changeRole,
  getAllCalls,
  updateUser,
  unlockDevice,
  deleteUser
};
