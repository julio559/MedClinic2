// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Subscription } = require('../models');
// Se tiver um middleware de validação, mantenha. Caso não, pode remover esta linha.
// const { validateAuth } = require('../middleware/validation');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Helper: remove campos sensíveis
function safeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    crm: u.crm || null,
    specialty: u.specialty || null,
    lastLogin: u.lastLogin || null,
  };
}

// Helper: cria token JWT
function signToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado no ambiente');
  }
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * REGISTRO
 * (Se você tiver um middleware validateAuth com Joi, reative abaixo)
 */
router.post('/register', /* validateAuth, */ async (req, res) => {
  try {
    let { name, email, password, phone, crm, specialty } = req.body || {};
    email = (email || '').trim().toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    // E-mail único
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // CRM único (somente se enviado)
    if (crm && String(crm).trim()) {
      const existingCRM = await User.findOne({ where: { crm } });
      if (existingCRM) {
        return res.status(400).json({ error: 'CRM já cadastrado' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      crm: crm || null,
      specialty: specialty || null,
    });

    // Assinatura trial inicial (7 dias, 3 análises)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    await Subscription.create({
      userId: user.id,
      plan: 'trial',
      endDate: trialEndDate,
      analysisLimit: 3,
    });

    const token = signToken(user);

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user: safeUser(user),
    });
  } catch (error) {
    // Em produção, evite retornar error.message direto
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

/**
 * LOGIN
 * Retorna 401 com { error: 'Credenciais inválidas' } se e-mail/senha não baterem.
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};
    email = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Subscription }],
    });

    // Mesmo retorno genérico para evitar revelar qual campo falhou
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    await user.update({ lastLogin: new Date() });

    const token = signToken(user);

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user: {
        ...safeUser(user),
        subscription: user.Subscription || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

module.exports = router;
