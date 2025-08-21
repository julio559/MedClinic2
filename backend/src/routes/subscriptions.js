// backend/src/routes/subscriptions.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../models');

const router = express.Router();
const sequelize = db.sequelize;

/** =========================================================
 * Utilidades para ler/normalizar a tabela plans dinamicamente
 * ========================================================= */
async function getPlansColumns() {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS name
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'plans'`,
    { replacements: [process.env.DB_NAME] }
  );
  const set = new Set(rows.map(r => r.name));
  const has = c => set.has(c);

  return {
    set,
    col: {
      id:             has('id') ? 'id' : null,
      name:           has('name') ? 'name' : null,
      price:          has('price') ? 'price' : null,
      currency:       has('currency') ? 'currency' : null,

      durationType:   has('duration_type') ? 'duration_type' : (has('durationType') ? 'durationType' : null),
      durationValue:  has('duration_value') ? 'duration_value' : (has('durationValue') ? 'durationValue' : null),

      analysisLimit:  has('analysis_limit') ? 'analysis_limit' : (has('analysisLimit') ? 'analysisLimit' : null),

      isPopular:      has('is_popular') ? 'is_popular' : (has('isPopular') ? 'isPopular' : null),
      isActive:       has('is_active') ? 'is_active' : (has('isActive') ? 'isActive' : null),

      features:       has('features') ? 'features' : null,
      color:          has('color') ? 'color' : null,

      createdAt:      (has('created_at') && 'created_at') || (has('createdAt') && 'createdAt') || null,
      updatedAt:      (has('updated_at') && 'updated_at') || (has('updatedAt') && 'updatedAt') || null,
    }
  };
}

function normalizePlanRow(row, col) {
  const pick = k => (col[k] ? row[col[k]] : null);

  let features = pick('features');
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch { /* deixa como string */ }
  }

  return {
    id:            pick('id'),
    name:          pick('name'),
    price:         Number(pick('price') ?? 0),
    currency:      pick('currency') || 'BRL',
    durationType:  pick('durationType') || 'months',
    durationValue: Number(pick('durationValue') ?? 1),
    analysisLimit: Number(pick('analysisLimit') ?? 0),
    isPopular:     Boolean(pick('isPopular')),
    isActive:      pick('isActive') === null ? true : Boolean(pick('isActive')),
    features:      features ?? [],
    color:         pick('color') || null,
    createdAt:     pick('createdAt') || null,
    updatedAt:     pick('updatedAt') || null,
  };
}

function buildSelectCols(col) {
  const cols = [];
  for (const key of Object.keys(col)) {
    if (!col[key]) continue;
    cols.push(`\`${col[key]}\` AS \`${col[key]}\``);
  }
  // Essenciais — tenta forçar se não detectou
  if (!col.id) cols.push('`id`');
  if (!col.name) cols.push('`name`');
  if (!col.price) cols.push('`price`');
  if (!col.currency) cols.push('`currency`');
  return cols.join(', ');
}

async function getPlanById(planId) {
  const { col } = await getPlansColumns();
  const colsSel = buildSelectCols(col);
  const [rows] = await sequelize.query(
    `SELECT ${colsSel} FROM \`plans\` WHERE \`${col.id || 'id'}\` = ? LIMIT 1`,
    { replacements: [planId] }
  );
  if (!rows || rows.length === 0) return null;
  return normalizePlanRow(rows[0], col);
}

async function getAnyActivePlanByIdOrFirst(planId) {
  const plan = await getPlanById(planId);
  if (plan) return plan;

  // Se não achou o id, tenta listar 1 plano ativo
  const { col } = await getPlansColumns();
  const colsSel = buildSelectCols(col);
  const whereActive = col.isActive ? `WHERE \`${col.isActive}\`=1` : '';
  const order = col.name ? `ORDER BY \`${col.name}\` ASC` : '';
  const [rows] = await sequelize.query(`SELECT ${colsSel} FROM \`plans\` ${whereActive} ${order} LIMIT 1`);
  if (rows && rows.length) return normalizePlanRow(rows[0], col);
  return null;
}

function calculateEndDate(durationType, durationValue) {
  const now = new Date();
  if (durationType === 'days') now.setDate(now.getDate() + Number(durationValue || 0));
  else if (durationType === 'months') now.setMonth(now.getMonth() + Number(durationValue || 0));
  else if (durationType === 'years') now.setFullYear(now.getFullYear() + Number(durationValue || 0));
  return now;
}

/** =========================================================
 * ROTAS
 * ========================================================= */

/**
 * GET /api/subscriptions
 * Retorna assinatura do usuário (e detalhes do plano normalizados)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Busca assinatura
    let subscription = await db.Subscription.findOne({ where: { userId } });

    // Se não existir, cria trial se houver plano 'trial'
    if (!subscription) {
      const trial = await getAnyActivePlanByIdOrFirst('trial');
      if (!trial) {
        // não há planos na tabela; retorna assinatura "vazia"
        return res.json({
          plan: 'trial',
          status: 'inactive',
          analysisLimit: 0,
          analysisUsed: 0,
          startDate: null,
          endDate: null,
          planDetails: null
        });
      }

      subscription = await db.Subscription.create({
        userId,
        plan: trial.id,
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(trial.durationType, trial.durationValue),
        analysisLimit: trial.analysisLimit,
        analysisUsed: 0
      });
    }

    // Carrega detalhes do plano sem usar associação (evita erro de colunas)
    const planDetails = await getAnyActivePlanByIdOrFirst(subscription.plan);

    res.json({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      analysisLimit: subscription.analysisLimit,
      analysisUsed: subscription.analysisUsed,
      planDetails
    });
  } catch (error) {
    console.error('Error loading subscription:', error);
    res.status(500).json({ error: 'Erro ao carregar assinatura' });
  }
});

/**
 * POST /api/subscriptions/upgrade
 * Atualiza assinatura para o plano informado (lendo o plano do banco)
 * Body: { plan: "monthly" }
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const planId = req.body.plan;

    const plan = await getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Plano inválido' });

    let subscription = await db.Subscription.findOne({ where: { userId } });
    const endDate = calculateEndDate(plan.durationType, plan.durationValue);

    if (!subscription) {
      subscription = await db.Subscription.create({
        userId,
        plan: plan.id,
        status: 'active',
        startDate: new Date(),
        endDate,
        analysisLimit: plan.analysisLimit,
        analysisUsed: 0
      });
    } else {
      await subscription.update({
        plan: plan.id,
        status: 'active',
        endDate,
        analysisLimit: plan.analysisLimit,
        analysisUsed: (plan.analysisLimit > (subscription.analysisLimit || 0)) ? 0 : subscription.analysisUsed
      });
    }

    const planDetails = await getPlanById(plan.id);

    res.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        analysisLimit: subscription.analysisLimit,
        analysisUsed: subscription.analysisUsed,
        planDetails
      }
    });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancela a assinatura (mantém ativa até o fim do período)
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const subscription = await db.Subscription.findOne({ where: { userId } });
    if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

    await subscription.update({ status: 'cancelled' });

    res.json({
      success: true,
      message: 'Assinatura cancelada com sucesso',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

module.exports = router;
