// backend/src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User, Subscription, sequelize } = require('../models');
const { v4: uuidv4 } = require('uuid');

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

// helper: pega primeiro plano ativo (de preferência 'trial')
async function getTrialPlan() {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, duration_type, duration_value, analysis_limit
         FROM plans
        WHERE (id = 'trial' OR is_active = 1)
        ORDER BY (id = 'trial') DESC, id ASC
        LIMIT 1`
    );
    return rows?.[0] || null;
  } catch {
    return null;
  }
}
function calcEndDate(duration_type, duration_value) {
  const now = new Date();
  const v = Number(duration_value || 0);
  if (duration_type === 'days') now.setDate(now.getDate() + v);
  else if (duration_type === 'months') now.setMonth(now.getMonth() + v);
  else if (duration_type === 'years') now.setFullYear(now.getFullYear() + v);
  else now.setDate(now.getDate() + 7); // default 7 dias
  return now;
}

// POST /api/auth/register
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const data = await registerSchema.validateAsync(req.body, { abortEarly: false });

    const email = String(data.email).trim().toLowerCase();
    const crm = String(data.crm).trim();

    // Verifica duplicidade
    const [existingEmail, existingCrm] = await Promise.all([
      User.findOne({ where: { email } }),
      User.findOne({ where: { crm } }),
    ]);
    if (existingEmail) return res.status(400).json({ error: 'E-mail já está em uso' });
    if (existingCrm)   return res.status(400).json({ error: 'CRM já está em uso' });

    const passwordHash = await bcrypt.hash(String(data.password), 10);

    const user = await User.create({
      name: String(data.name).trim(),
      email,
      passwordHash, // mapeado para coluna 'password'
      phone: data.phone ? String(data.phone).trim() : null,
      crm,
      specialty: data.specialty ? String(data.specialty).trim() : null,
      avatar: data.avatar || null,
      isActive: true
    });

    // Cria assinatura trial silenciosa
    try {
      const hasSub = await Subscription.findOne({ where: { userId: user.id } });
      if (!hasSub) {
        const plan = await getTrialPlan();
        if (plan) {
          await Subscription.create({
            id: uuidv4(),
            userId: user.id,
            plan: plan.id,
            status: 'active',
            startDate: new Date(),
            endDate: calcEndDate(plan.duration_type, plan.duration_value),
            analysisLimit: Number(plan.analysis_limit || 0),
            analysisUsed: 0
          });
        }
      }
    } catch (subErr) {
      console.error('[REGISTER][SUBSCRIPTION] Falha ao criar assinatura trial:', {
        message: subErr.message,
        stack: subErr.stack,
        sql: subErr.sql,
        fields: subErr.fields
      });
    }

    const token = signToken(user.id);
    return res.status(200).json({ token, user: toSafeUser(user) });

  } catch (err) {
    // 🟢 Logs explicativos
    console.error('[REGISTER][ERROR]', {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      fields: err?.fields,
      errors: err?.errors,
      sql: err?.sql
    });

    if (err.isJoi) {
      return res.status(400).json({
        error: 'Validação de dados falhou',
        details: err.details.map(d => d.message)
      });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      return res.status(500).json({ error: 'Configuração ausente: JWT_SECRET' });
    }
    if (err?.name === 'SequelizeUniqueConstraintError') {
      const field = err.errors?.[0]?.path || 'campo único';
      return res.status(400).json({ error: `Valor já cadastrado para ${field}` });
    }

    return res.status(500).json({ error: 'Erro interno ao registrar usuário' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const data = await loginSchema.validateAsync(req.body, { abortEarly: false });
    const email = String(data.email).trim().toLowerCase();

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const ok = await bcrypt.compare(String(data.password), String(user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken(user.id);
    await user.update({ lastLogin: new Date() });

    return res.status(200).json({ token, user: toSafeUser(user) });
  } catch (err) {
    if (err.isJoi) {
      return res.status(400).json({ error: 'Dados inválidos', details: err.details.map(d => d.message) });
    }
    if (String(err.message).includes('JWT_SECRET')) {
      console.error('Auth login error:', err.message);
      return res.status(500).json({ error: 'Configuração do servidor ausente (JWT_SECRET)' });
    }
    console.error('Auth login error:', {
      name: err?.name, message: err?.message,
      errors: err?.errors, fields: err?.fields, stack: err?.stack
    });
    return res.status(500).json({ error: 'Erro ao autenticar' });
  }
});

module.exports = router;
