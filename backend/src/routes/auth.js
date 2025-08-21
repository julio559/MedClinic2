const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Subscription } = require('../models');
const { validateAuth } = require('../middleware/validation');
const router = express.Router();

// Register
router.post('/register', validateAuth, async (req, res) => {
  try {
    const { name, email, password, phone, crm, specialty } = req.body;
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const existingCRM = await User.findOne({ where: { crm } });
    if (existingCRM) {
      return res.status(400).json({ error: 'CRM já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name, email, password: hashedPassword, phone, crm, specialty
    });

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    await Subscription.create({
      userId: user.id, plan: 'trial', endDate: trialEndDate, analysisLimit: 3
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Usuário criado com sucesso', token,
      user: { id: user.id, name: user.name, email: user.email, crm: user.crm, specialty: user.specialty }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ 
      where: { email }, include: [{ model: Subscription }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    await user.update({ lastLogin: new Date() });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login realizado com sucesso', token,
      user: {
        id: user.id, name: user.name, email: user.email, 
        crm: user.crm, specialty: user.specialty, subscription: user.Subscription
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
