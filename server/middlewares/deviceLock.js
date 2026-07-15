const deviceLock = async (req, res, next) => {
  try {
    const user = req.user; // Set by authMiddleware
    if (!user) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
    }

    const currentDeviceId = req.cookies.deviceId;

    // Bypass device lock if this is an authorized tracker tool
    if (req.isTracker) {
      return next();
    }

    // If user has a deviceId registered but it doesn't match the cookie
    // Bypass this check for SuperAdmin to prevent lockouts during testing/admin duties
    if (user.role !== 'SuperAdmin' && user.deviceId && user.deviceId !== currentDeviceId) {
      return res.status(403).json({ 
        error: 'تم تسجيل الدخول من جهاز آخر. لا يمكنك استخدام نفس الحساب على أجهزة متعددة. يرجى مراجعة الإدارة.' 
      });
    }

    // If user does not have a deviceId yet but has a cookie, save it
    if (!user.deviceId && currentDeviceId) {
      user.deviceId = currentDeviceId;
      await user.save();
    }

    next();
  } catch (error) {
    console.error('Device Lock Error:', error);
    res.status(500).json({ error: 'خطأ في التحقق من الجهاز' });
  }
};

module.exports = deviceLock;
