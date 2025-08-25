// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().allow('', null),
  crm: Joi.string().min(2).required(),
  specialty: Joi.string().allow('', null),
  avatar: Joi.string().allow('', null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function signToken(userId) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET ausente nas variáveis de ambiente');
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const data = await registerSchema.validateAsync(req.body, { abortEarly: false });

    // Confere duplicidade (evita 500 por unique)
    const existingEmail = await User.findOne({ where: { email: data.email } });
    if (existingEmail) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const existingCrm = await User.findOne({ where: { crm: data.crm } });
    if (existingCrm) return res.status(409).json({ error: 'CRM já cadastrado' });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash, // vai para a coluna 'password' por causa do field
      phone: data.phone || null,
      crm: data.crm,
      specialty: data.specialty || null,
      avatar: data.avatar || null,
      isActive: true
    });

    const token = signToken(user.id);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        crm: user.crm,
        specialty: user.specialty,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.details.map(d => d.message) });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      console.error('Auth register error:', err.message);
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }
    // Captura de erros de unique no Sequelize
    if (err?.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors?.[0]?.path || 'campo único';
      return res.status(409).json({ error: `Valor já cadastrado para ${field}` });
    }
    console.error('Auth register error:', err);
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken(user.id);
    await user.update({ lastLogin: new Date() });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        crm: user.crm,
        specialty: user.specialty,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.details.map(d => d.message) });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      console.error('Auth login error:', err.message);
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }
    console.error('Auth login error:', err);
    return res.status(500).json({ error: 'Erro ao autenticar' });
  }
});

module.exports = router;
