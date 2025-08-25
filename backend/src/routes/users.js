// backend/src/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { User, Patient, Analysis } = require('../models');

// Compatível com export default OU export nomeado do middleware
const authModule = require('../middleware/auth');
const authenticate = authModule.authenticate || authModule;

const router = express.Router();

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

function getUserId(req) {
  // aceita req.userId (nosso middleware) OU req.user.userId (formato antigo)
  return req.userId || (req.user && req.user.userId) || null;
}

/**
 * GET /api/users/me
 * Retorna o usuário autenticado (seguro)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Token inválido' });

    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(toSafeUser(user));
  } catch (e) {
    console.error('GET /users/me error', e);
    return res.status(500).json({ error: 'Erro ao carregar perfil' });
  }
});

/**
 * GET /api/users/profile
 * Alias de /me para compatibilidade com o app
 */
router.get('/profile', authenticate, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Token inválido' });

    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(toSafeUser(user));
  } catch (e) {
    console.error('GET /users/profile error', e);
    return res.status(500).json({ error: 'Erro ao carregar perfil' });
  }
});

/**
 * PUT /api/users/me
 * body: { name, email, crm, specialty, phone }
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Token inválido' });

    const { name, email, crm, specialty, phone } = req.body || {};
    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    // Se mudar e-mail, garanta unicidade
    if (email !== user.email) {
      const exists = await User.findOne({ where: { email: String(email).trim() } });
      if (exists) return res.status(400).json({ error: 'E-mail já está em uso' });
    }

    await user.update({
      name: String(name).trim(),
      email: String(email).trim(),
      crm: crm ? String(crm).trim() : null,
      specialty: specialty ? String(specialty).trim() : null,
      phone: phone ? String(phone).trim() : null,
    });

    return res.json(toSafeUser(user));
  } catch (e) {
    console.error('PUT /users/me error', e);
    return res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

/**
 * POST /api/users/change-password
 * body: { currentPassword, newPassword }
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const uid = getUserId(req);
    if (!uid) return res.status(401).json({ error: 'Token inválido' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await User.findByPk(uid);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Compatível com modelos antigos (password) e novos (passwordHash)
    const currentHash = user.passwordHash ?? user.password ?? null;
    if (!currentHash) {
      return res.status(500).json({ error: 'Campo de senha não encontrado no usuário' });
    }

    const ok = await bcrypt.compare(String(currentPassword), String(currentHash));
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });

    const newHash = await bcrypt.hash(String(newPassword), 10);
    if (user.passwordHash !== undefined) {
      await user.update({ passwordHash: newHash });
    } else {
      await user.update({ password: newHash });
    }

    return res.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (e) {
    console.error('POST /users/change-password error', e);
    return res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, crm, specialty } = req.body || {};

    if (!name || !email || !password || !crm) {
      return res.status(400).json({ error: 'Nome, e-mail, senha e CRM são obrigatórios' });
    }

    // normaliza
    const normEmail = String(email).trim().toLowerCase();
    const normName  = String(name).trim();
    const normCrm   = String(crm).trim();

    // unicidade
    const emailExists = await User.findOne({ where: { email: normEmail } });
    if (emailExists) return res.status(400).json({ error: 'E-mail já está em uso' });
    const crmExists = await User.findOne({ where: { crm: normCrm } });
    if (crmExists) return res.status(400).json({ error: 'CRM já está em uso' });

    // hash
    const hash = await bcrypt.hash(String(password), 10);

    // ATENÇÃO: salvar em passwordHash (mapeado para a coluna "password")
    const user = await User.create({
      name: normName,
      email: normEmail,
      passwordHash: hash,
      phone: phone ? String(phone).trim() : null,
      crm: normCrm,
      specialty: specialty ? String(specialty).trim() : null,
    });

    return res.status(201).json(toSafeUser(user));
  } catch (e) {
    // ajuda a debugar a causa real
    if (e.name === 'SequelizeValidationError' || e.name === 'SequelizeUniqueConstraintError') {
      const msg = e.errors?.[0]?.message || 'Erro de validação';
      console.error('POST /users/register validation', msg, e.errors);
      return res.status(400).json({ error: msg });
    }
    console.error('POST /users/register error', e);
    return res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});


/**
 * GET /api/users/stats
 * Estatísticas do médico logado
 * { totalAnalyses, completedAnalyses, processingAnalyses, totalPatients }
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const doctorId = getUserId(req);
    if (!doctorId) return res.status(401).json({ error: 'Token inválido' });

    const totalPatients = await Patient.count({ where: { doctorId } });
    const totalAnalyses = await Analysis.count({ where: { doctorId } });
    const completedAnalyses = await Analysis.count({ where: { doctorId, status: 'completed' } });
    const processingAnalyses = await Analysis.count({ where: { doctorId, status: 'processing' } });

    return res.json({
      totalAnalyses,
      completedAnalyses,
      processingAnalyses,
      totalPatients,
    });
  } catch (e) {
    console.error('GET /users/stats error', e);
    return res.status(500).json({ error: 'Erro ao carregar estatísticas' });
  }
});

module.exports = router;
