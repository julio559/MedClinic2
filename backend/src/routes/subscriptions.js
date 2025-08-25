// backend/src/routes/subscriptions.js
const express = require('express');
const db = require('../models');

// Import compatível com export default OU nomeado
const authModule = require('../middleware/auth');
const authenticate = authModule?.authenticate || authModule;

const router = express.Router();
const sequelize = db.sequelize;

/* ===========================
 * Helpers de schema / columns
 * =========================== */
async function getSchemaName(diag) {
  if (process.env.DB_NAME) return process.env.DB_NAME;

  const cfgDb =
    sequelize?.config?.database ||
    sequelize?.options?.database ||
    null;
  if (cfgDb) return cfgDb;

  try {
    const [rows] = await sequelize.query('SELECT DATABASE() AS db');
    if (rows && rows[0]?.db) return rows[0].db;
  } catch (e) {
    diag.errors.push(`getSchemaName: ${e?.message || e}`);
  }
  return null;
}

async function plansTableExists(schemaName, diag) {
  try {
    const [rows] = await sequelize.query(
      `SELECT TABLE_NAME AS name
         FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'plans'
        LIMIT 1`,
      { replacements: [schemaName] }
    );
    return !!(rows && rows.length);
  } catch (e) {
    diag.errors.push(`plansTableExists: ${e?.message || e}`);
    return false;
  }
}

async function getPlansColumns(diag) {
  const schemaName = await getSchemaName(diag);
  if (!schemaName) {
    diag.errors.push('Schema do banco não identificado (defina DB_NAME ou DATABASE_URL)');
    return { set: new Set(), col: {}, schemaName: null };
  }
  const exists = await plansTableExists(schemaName, diag);
  if (!exists) return { set: new Set(), col: {}, schemaName };

  try {
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME AS name
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'plans'`,
      { replacements: [schemaName] }
    );
    const set = new Set(rows.map(r => r.name));
    const has = c => set.has(c);

    return {
      schemaName,
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
  } catch (e) {
    diag.errors.push(`getPlansColumns: ${e?.message || e}`);
    return { set: new Set(), col: {}, schemaName };
  }
}

function normalizePlanRow(row, col) {
  const pick = k => (col[k] ? row[col[k]] : null);

  let features = pick('features');
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch { /* deixa string */ }
  }

  return {
    id:            pick('id'),
    name:          pick('name'),
    price:         Number(pick('price') ?? 0),
    currency:      pick('currency') || 'BRL',
    durationType:  pick('durationType') || 'months',
    durationValue: Number(pick('durationValue') ?? 1),
    analysisLimit: Number(pick('analysisLimit') ?? 0),
    isPopular:     pick('isPopular') ? Boolean(pick('isPopular')) : false,
    isActive:      pick('isActive') === null ? true : Boolean(pick('isActive')),
    features:      features ?? [],
    color:         pick('color') || null,
    createdAt:     pick('createdAt') || null,
    updatedAt:     pick('updatedAt') || null,
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

async function getPlanById(planId, diag) {
  const { col, set } = await getPlansColumns(diag);
  if (!set || set.size === 0) return null;
  const colsSel = buildSelectCols(col);
  const keyId = col.id || 'id';
  try {
    const [rows] = await sequelize.query(
      `SELECT ${colsSel} FROM \`plans\` WHERE \`${keyId}\` = ? LIMIT 1`,
      { replacements: [planId] }
    );
    if (!rows || rows.length === 0) return null;
    return normalizePlanRow(rows[0], col);
  } catch (e) {
    diag.errors.push(`getPlanById: ${e?.message || e}`);
    return null;
  }
}

async function getAnyActivePlanByIdOrFirst(planId, diag) {
  const tried = planId ? await getPlanById(planId, diag) : null;
  if (tried) return tried;

  const { col, set } = await getPlansColumns(diag);
  if (!set || set.size === 0) return null;

  const colsSel = buildSelectCols(col);
  const whereActive = col.isActive ? `WHERE \`${col.isActive}\` = 1` : '';
  const order = col.name ? `ORDER BY \`${col.name}\` ASC` : '';
  try {
    const [rows] = await sequelize.query(`SELECT ${colsSel} FROM \`plans\` ${whereActive} ${order} LIMIT 1`);
    if (rows && rows.length) return normalizePlanRow(rows[0], col);
    return null;
  } catch (e) {
    diag.errors.push(`getAnyActivePlanByIdOrFirst: ${e?.message || e}`);
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

/* =======
 * ROTAS
 * ======= */

// GET /api/subscriptions
router.get('/', authenticate, async (req, res) => {
  const diag = { errors: [], debug: Boolean(req.query?.debug) };
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    if (!db.Subscription) {
      const msg = 'Model Subscription não encontrado em ../models (export faltando?)';
      console.error(msg);
      return res.status(500).json({ error: msg, ...(diag.debug && { diag }) });
    }

    let subscription = await db.Subscription.findOne({ where: { userId } });

    if (!subscription) {
      const trialOrFirst =
        (await getAnyActivePlanByIdOrFirst('trial', diag)) ||
        (await getAnyActivePlanByIdOrFirst(null, diag));

      if (!trialOrFirst) {
        // Sem tabela 'plans' ou sem planos
        return res.json({
          plan: 'trial',
          status: 'inactive',
          analysisLimit: 0,
          analysisUsed: 0,
          startDate: null,
          endDate: null,
          planDetails: null,
          ...(diag.debug && { diag })
        });
      }

      subscription = await db.Subscription.create({
        userId,
        plan: trialOrFirst.id,
        status: 'active',
        startDate: new Date(),
        endDate: calculateEndDate(trialOrFirst.durationType, trialOrFirst.durationValue),
        analysisLimit: trialOrFirst.analysisLimit,
        analysisUsed: 0
      });
    }

    const planDetails =
      (await getPlanById(subscription.plan, diag)) ||
      (await getAnyActivePlanByIdOrFirst(subscription.plan, diag)) ||
      null;

    return res.json({
      id: subscription.id,
      plan: subscription.plan,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      analysisLimit: subscription.analysisLimit,
      analysisUsed: subscription.analysisUsed,
      planDetails,
      ...(diag.debug && { diag })
    });
  } catch (error) {
    console.error('Error loading subscription:', error?.message || error);
    return res.status(500).json({
      error: 'Erro ao carregar assinatura',
      ...(diag.debug && { diag: { ...diag, caught: String(error?.message || error) } })
    });
  }
});

// POST /api/subscriptions/upgrade
router.post('/upgrade', authenticate, async (req, res) => {
  const diag = { errors: [], debug: Boolean(req.query?.debug) };
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    if (!db.Subscription) {
      const msg = 'Model Subscription não encontrado em ../models (export faltando?)';
      console.error(msg);
      return res.status(500).json({ error: msg, ...(diag.debug && { diag }) });
    }

    const planId = String(req.body?.plan || '').trim();
    if (!planId) return res.status(400).json({ error: 'Plano não informado' });

    const plan = await getPlanById(planId, diag);
    if (!plan) return res.status(400).json({ error: 'Plano inválido', ...(diag.debug && { diag }) });

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

    const planDetails = await getPlanById(plan.id, diag);

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
      },
      ...(diag.debug && { diag })
    });
  } catch (error) {
    console.error('Error upgrading plan:', error?.message || error);
    return res.status(500).json({
      error: 'Erro ao atualizar plano',
      ...(diag.debug && { diag: { ...diag, caught: String(error?.message || error) } })
    });
  }
});

// POST /api/subscriptions/cancel
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Token inválido' });

    if (!db.Subscription) {
      return res.status(500).json({ error: 'Model Subscription não encontrado em ../models' });
    }

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
