const { Notification, User } = require('../models');

// User requests activation
const requestActivation = async (req, res) => {
  try {
    const user = req.user;
    
    // Check if there's already an unread notification for this user
    const existing = await Notification.findOne({
      where: { userId: user.id, isRead: false }
    });

    if (existing) {
      return res.status(400).json({ error: 'تم إرسال الطلب مسبقاً، يرجى الانتظار.' });
    }

    await Notification.create({
      message: `المستخدم ${user.fullName} يطلب تفعيل حسابه.`,
      userId: user.id
    });

    res.json({ message: 'تم إرسال التنبيه للإدارة بنجاح.' });
  } catch (error) {
    console.error('Error requesting activation:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء الإرسال.' });
  }
};

// Admin gets all notifications
const getNotifications = async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [
          { userId: req.user.id },
          { message: { [Op.like]: '%تفعيل حسابه%' } } // Fallback for old system notifications
        ]
      },
      order: [['createdAt', 'DESC']],
      limit: 50 // Limit to latest 50
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الإشعارات.' });
  }
};

// Admin marks a notification as read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ error: 'الإشعار غير موجود.' });

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'تم التحديث بنجاح.' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإشعار.' });
  }
};

module.exports = {
  requestActivation,
  getNotifications,
  markAsRead
};
