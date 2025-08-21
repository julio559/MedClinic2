// backend/src/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { User, Patient, Analysis } = require('../models');

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
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * GET /api/users/me
 * Retorna o usuário autenticado (seguro)
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
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
    const user = await User.findByPk(req.user.userId);
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
    const { name, email, crm, specialty, phone } = req.body;
    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }

    // Se mudar e-mail, garanta unicidade
    if (email !== user.email) {
      const exists = await User.findOne({ where: { email } });
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
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Informe a senha atual e a nova senha' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

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

/**
 * GET /api/users/stats
 * Retorna estatísticas pro dashboard do médico logado
 * Response:
 * { totalAnalyses, completedAnalyses, processingAnalyses, totalPatients }
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const doctorId = req.user.userId;

    // Pacientes do médico
    const totalPatients = await Patient.count({ where: { doctorId } });

    // Análises do médico
    const totalAnalyses = await Analysis.count({ where: { doctorId } });
    const completedAnalyses = await Analysis.count({
      where: { doctorId, status: 'completed' },
    });

    // Se seu sistema usa outro status (ex: 'processing', 'in_progress', etc), ajuste aqui:
    const processingAnalyses = await Analysis.count({
      where: { doctorId, status: 'processing' },
    });

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
