const { Shift, User } = require('../models');

exports.createShift = async (req, res) => {
  try {
    const { name, startTime, endTime, workingDays } = req.body;
    const newShift = await Shift.create({
      name,
      startTime,
      endTime,
      workingDays
    });
    res.status(201).json(newShift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الوردية' });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, workingDays } = req.body;
    
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }

    await shift.update({
      name,
      startTime,
      endTime,
      workingDays
    });

    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الوردية' });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const shifts = await Shift.findAll({
      include: [{
        model: User,
        attributes: ['id', 'fullName', 'username', 'role', 'avatar', 'jobTitle']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب الورديات' });
  }
};

exports.getMyShifts = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      include: [{
        model: Shift,
        through: { attributes: [] }
      }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    
    res.json(user.Shifts || []);
  } catch (error) {
    console.error('Error fetching my shifts:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء جلب وردياتي' });
  }
};

exports.assignUsersToShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body; // Array of User IDs

    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }

    // Sequelize magic method for many-to-many:
    // This will replace the existing associations with the new ones
    await shift.setUsers(userIds);

    res.json({ message: 'تم تعيين الموظفين للوردية بنجاح' });
  } catch (error) {
    console.error('Error assigning users to shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تعيين الموظفين' });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await Shift.findByPk(id);
    if (!shift) {
      return res.status(404).json({ error: 'الوردية غير موجودة' });
    }
    await shift.destroy();
    res.json({ message: 'تم حذف الوردية بنجاح' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الوردية' });
  }
};
