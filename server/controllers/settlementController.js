const { MonthlySettlement, User } = require('../models');
const { sendSettlementEmail } = require('../utils/emailService');

exports.getSettlements = async (req, res) => {
  try {
    const { monthKey } = req.query;
    if (!monthKey) {
      return res.status(400).json({ error: 'monthKey is required' });
    }

    const settlements = await MonthlySettlement.findAll({
      where: { monthKey },
      attributes: ['userId', 'status', 'settledAt']
    });

    res.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: 'Server error fetching settlements' });
  }
};

exports.toggleSettlement = async (req, res) => {
  try {
    const { userId, monthKey, status, accountDetails } = req.body;
    if (!userId || !monthKey || !status) {
      return res.status(400).json({ error: 'userId, monthKey, and status are required' });
    }

    let settlement = await MonthlySettlement.findOne({
      where: { userId, monthKey }
    });

    if (settlement) {
      settlement.status = status;
      settlement.settledAt = status === 'Settled' ? new Date() : null;
      await settlement.save();
    } else {
      settlement = await MonthlySettlement.create({
        userId,
        monthKey,
        status,
        settledAt: status === 'Settled' ? new Date() : null
      });
    }

    if (status === 'Settled' && accountDetails) {
      // Send Email asynchronously without blocking the response
      sendSettlementEmail(req.user, accountDetails, monthKey).catch(err => {
        console.error('Failed to send settlement email:', err);
      });
    }

    res.json({ message: 'Settlement status updated', settlement });
  } catch (error) {
    console.error('Error toggling settlement:', error);
    res.status(500).json({ error: 'Server error updating settlement status' });
  }
};
