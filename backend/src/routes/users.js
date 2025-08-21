const express = require('express');
const { User, Patient, Analysis, Subscription } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      include: [{ model: Subscription }],
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const totalPatients = await Patient.count({
      where: { doctorId: req.user.userId }
    });

    const totalAnalyses = await Analysis.count({
      where: { doctorId: req.user.userId }
    });

    const completedAnalyses = await Analysis.count({
      where: { doctorId: req.user.userId, status: 'completed' }
    });

    const processingAnalyses = await Analysis.count({
      where: { doctorId: req.user.userId, status: 'processing' }
    });

    res.json({
      totalPatients, totalAnalyses, completedAnalyses, processingAnalyses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
