// backend/src/routes/subscriptions.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models');

// Import compatível com export default OU nomeado
const authModule = require('../middleware/auth');
const authenticate = authModule?.authenticate || authModule;

const router = express.Router();
const sequelize = db.sequelize;

/* =============== Helpers de schema/columns =============== */
async function getSchemaName() {
  if (process.env.DB_NAME) return process.env.DB_NAME;
  const cfg = sequelize?.config?.database || sequelize?.options?.database || null;
  if (cfg) return cfg;
  try {
    const [rows] = await sequelize.query('SELECT DATABASE() AS db');
    if (rows?.[0]?.db) return rows[0].db;
  } catch {}
  return null;
}

async function plansTableExists(schemaName) {
  try {
    const [rows] = await sequelize.query(
      `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'plans'
        LIMIT 1`,
      { replacements: [schemaName] }
    );
    return !!rows?.length;
  } catch {
    return false;
  }
}

async function getPlansColumns() {
  const schema = await getSchemaName();
  if (!schema) return { set: new Set(), col: {} };
  if (!(await plansTableExists(schema))) return { set: new Set(), col: {} };

  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS name
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'plans'`,
    { replacements: [schema] }
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
  if (typeof features === 'string') { try { features = JSON.parse(features); } catch {} }
  return {
    id: pick('id'),
    name: pick('name'),
    price: Number(pick('price') ?? 0),
    currency: pick('currency') || 'BRL',
    durationType: pick('durationType') || 'months',
    durationValue: Number(pick('durationValue') ?? 1),
    analysisLimit: Number(pick('analysisLimit') ?? 0),
    isPopular: Boolean(pick('isPopular')),
    isActive: pick('isActive') === null ? true : Boolean(pick('isActive')),
    features: features ?? [],
    color: pick('color') || null,
    createdAt: pick('createdAt') || null,
    updatedAt: pick('updatedAt') || null,
  };
}

function buildSelectCols(col) {
  const keys = Object.keys(col).filter(k => !!col[k]);
  const cols = keys.map(k => `\`${col[k]}\` AS \`${col[k]}\``);
  if (!col.id) cols.push('`id`');
  if (!col.name) cols.push('`name`');
  if (!col.price) cols.push('`price`');
  if (!col.currency) cols.push('`currency`');
  return cols.join(', ');
}

async function getPlanById(planId) {
  const { col, set } = await getPlansColumns();
  if (!set.size) return null;
  const colsSel = buildSelectCols(col);
  const keyId = col.id || 'id';
  try {
    const [rows] = await sequelize.query(
      `SELECT ${colsSel} FROM \`plans\` WHERE \`${keyId}\` = ? LIMIT 1`,
      { replacements: [planId] }
    );
    if (!rows?.length) return null;
    return normalizePlanRow(rows[0], col);
  } catch {
    return null;
  }
}

async function getAnyActivePlanByIdOrFirst(planId) {
  if (planId) {
    const p = await getPlanById(planId);
    if (p) return p;
  }
  const { col, set } = await getPlansColumns();
  if (!set.size) return null;
  const colsSel = buildSelectCols(col);
  const whereActive = col.isActive ? `WHERE \`${col.isActive}\` = 1` : '';
  const order = col.name ? `ORDER BY \`${col.name}\` ASC` : '';
  try {
    const [rows] = await sequelize.query(`SELECT ${colsSel} FROM \`plans\` ${whereActive} ${order} LIMIT 1`);
    if (!rows?.length) return null;
    return normalizePlanRow(rows[0], col);
  } catch {
    return null;
  }
}

function calculateEndDate(durationType, durationValue) {
  const now = new Date();
  const val = Number(durationValue || 0);
  if (durationType === 'days') now.setDate(now.getDate() + val);
  else if (durationType === 'months') now.setMonth(now.getMonth() + val);
  else if (durationType === 'years') now.setFullYear(now.getFullYear() + val);
  else now.setMonth(now.getMonth() + val);
  return now;
}

/* ================== ROTAS ================== */

// GET /api/subscriptions
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId; // ✅ do middleware
    if (!userId) return res.status(401).json({ error: 'Token inválido' });
    if (!db.Subscription) return res.status(500).json({ error: 'Model Subscription não encontrado' });

    let subscription = await db.Subscription.findOne({ where: { userId } });

    // cria trial (ou primeiro ativo) se não houver
    if (!subscription) {
      const plan = (await getAnyActivePlanByIdOrFirst('trial')) || (await getAnyActivePlanByIdOrFirst(null));

      if (!plan) {
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
        id: uuidv4(),                // garante id
        userId,                      // 🔴 OBRIGATÓRIO
        plan: plan.id,
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(plan.durationType, plan.durationValue),
        analysisLimit: plan.analysisLimit,
        analysisUsed: 0
      });
    }

    // detalhes do plano (melhor esforço)
    let planDetails = null;
    try {
      planDetails =
        (await getPlanById(subscription.plan)) ||
        (await getAnyActivePlanByIdOrFirst(subscription.plan)) ||
        null;
    } catch {}

    return res.json({
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
    console.error('Error loading subscription:', error?.message || error);
    return res.status(500).json({ error: 'Erro ao carregar assinatura' });
  }
});

// POST /api/subscriptions/upgrade
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });
    if (!db.Subscription) return res.status(500).json({ error: 'Model Subscription não encontrado' });

    const planId = String(req.body?.plan || '').trim();
    if (!planId) return res.status(400).json({ error: 'Plano não informado' });

    const plan = await getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Plano inválido' });

    let subscription = await db.Subscription.findOne({ where: { userId } });
    const endDate = calculateEndDate(plan.durationType, plan.durationValue);

    if (!subscription) {
      subscription = await db.Subscription.create({
        id: uuidv4(),
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

    let planDetails = null;
    try { planDetails = await getPlanById(plan.id); } catch {}

    return res.json({
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
    console.error('Error upgrading plan:', error?.message || error);
    return res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });
    if (!db.Subscription) return res.status(500).json({ error: 'Model Subscription não encontrado' });

    const subscription = await db.Subscription.findOne({ where: { userId } });
    if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

    await subscription.update({ status: 'cancelled' });

    return res.json({
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
    console.error('Error cancelling subscription:', error?.message || error);
    return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

module.exports = router;
