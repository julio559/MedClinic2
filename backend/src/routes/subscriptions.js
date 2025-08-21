const express = require('express');
const { Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get user subscription
router.get('/', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: { userId: req.user.userId }
    });

    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    
    const planLimits = {
      trial: { limit: 3, days: 7 },
      monthly: { limit: 50, days: 30 },
      quarterly: { limit: 200, days: 90 },
      annual: { limit: 1000, days: 365 }
    };

    const planInfo = planLimits[plan];
    if (!planInfo) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planInfo.days);

    const subscription = await Subscription.findOne({
      where: { userId: req.user.userId }
    });

    await subscription.update({
      plan, endDate, analysisLimit: planInfo.limit, analysisUsed: 0, status: 'active'
    });

    res.json({ message: 'Plano atualizado com sucesso', subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
