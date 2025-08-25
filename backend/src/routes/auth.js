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

function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    crm: user.crm,
    specialty: user.specialty,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive,
    role: user.role ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = await registerSchema.validateAsync(req.body, { abortEarly: false });

    // evitar duplicidade explícita (além do unique do banco)
    const [existingEmail, existingCrm] = await Promise.all([
      User.findOne({ where: { email: String(data.email).trim().toLowerCase() } }),
      User.findOne({ where: { crm: String(data.crm).trim() } }),
    ]);
    if (existingEmail) return res.status(400).json({ error: 'E-mail já está em uso' });
    if (existingCrm)   return res.status(400).json({ error: 'CRM já está em uso' });

    const passwordHash = await bcrypt.hash(String(data.password), 10);

    const user = await User.create({
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      passwordHash, // mapeia para a coluna 'password' via field no model
      phone: data.phone ? String(data.phone).trim() : null,
      crm: String(data.crm).trim(),
      specialty: data.specialty ? String(data.specialty).trim() : null,
      avatar: data.avatar || null,
      isActive: true
    });

    // ✔ retorna 200 (alguns fronts só tratam 200)
    const token = signToken(user.id);
    return res.status(200).json({
      token,
      user: toSafeUser(user)
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.details.map(d => d.message) });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      console.error('Auth register error:', err.message);
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }
    if (err?.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors?.[0]?.path || 'campo único';
      return res.status(400).json({ error: `Valor já cadastrado para ${field}` });
    }

    // Log detalhado para Cloud Run/Logging
    console.error('Auth register error:', {
      name: err?.name,
      message: err?.message,
      errors: err?.errors,
      fields: err?.fields,
      stack: err?.stack
    });

    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const user = await User.findOne({ where: { email: String(data.email).trim().toLowerCase() } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(String(data.password), String(user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken(user.id);
    await user.update({ lastLogin: new Date() });

    return res.status(200).json({
      token,
      user: toSafeUser(user)
    });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.details.map(d => d.message) });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      console.error('Auth login error:', err.message);
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }

    console.error('Auth login error:', {
      name: err?.name,
      message: err?.message,
      errors: err?.errors,
      fields: err?.fields,
      stack: err?.stack
    });

    return res.status(500).json({ error: 'Erro ao autenticar' });
  }
});

module.exports = router;
