const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies.token;

    // Support Bearer token from header (for Desktop Tracker Tool)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح لك بالدخول، يرجى تسجيل الدخول' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'المستخدم غير موجود' });
    }

    if (decoded.version !== user.jwtVersion) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'الجلسة منتهية بسبب فك الارتباط أو تغيير الإعدادات. يرجى تسجيل الدخول مجدداً' });
    }

    req.user = user;
    req.isTracker = decoded.isTracker || false;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً' });
  }
};

module.exports = authMiddleware;
