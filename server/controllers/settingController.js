const { Setting } = require('../models');

// Get all settings or a specific setting by key
exports.getSettings = async (req, res) => {
  try {
    const { key } = req.query;
    if (key) {
      const setting = await Setting.findOne({ where: { key } });
      return res.json({ [key]: setting ? setting.value : null });
    }
    
    const settings = await Setting.findAll();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });
    
    res.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

// Update or create a setting
exports.updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }

    // Check if user is Admin/SuperAdmin
    if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Not authorized to update settings' });
    }

    let setting = await Setting.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      setting = await Setting.create({ key, value });
    }

    res.json({ success: true, setting });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};
