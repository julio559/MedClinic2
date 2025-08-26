// backend/src/routes/plans.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const db = require('../models');

const router = express.Router();
const sequelize = db.sequelize;

/** Lê colunas existentes da tabela plans (snake/camel) */
async function getPlansColumns() {
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME AS name
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = 'plans'`,
    { replacements: [process.env.DB_NAME] }
  );
  const set = new Set(rows.map(r => r.name));

  // Mapear preferindo snake_case; se não tiver, usa camelCase
  const has = c => set.has(c);

  const col = {
    id:             has('id') ? 'id' : null,
    name:           has('name') ? 'name' : null,
    price:          has('price') ? 'price' : null,
    currency:       has('currency') ? 'currency' : null,

    // duração
    durationType:   has('duration_type') ? 'duration_type' : (has('durationType') ? 'durationType' : null),
    durationValue:  has('duration_value') ? 'duration_value' : (has('durationValue') ? 'durationValue' : null),

    // limites
    analysisLimit:  has('analysis_limit') ? 'analysis_limit' : (has('analysisLimit') ? 'analysisLimit' : null),

    // flags
    isPopular:      has('is_popular') ? 'is_popular' : (has('isPopular') ? 'isPopular' : null),
    isActive:       has('is_active') ? 'is_active' : (has('isActive') ? 'isActive' : null),

    // extras
    features:       has('features') ? 'features' : null,
    color:          has('color') ? 'color' : null,

    // datas (usamos só se existirem, não é obrigatório)
    createdAt:      (has('created_at') && 'created_at') || (has('createdAt') && 'createdAt') || null,
    updatedAt:      (has('updated_at') && 'updated_at') || (has('updatedAt') && 'updatedAt') || null,
  };

  return { set, col };
}

/** Normaliza uma linha do banco para o shape esperado pelo frontend */
function normalizePlanRow(row, col) {
  const pick = k => (col[k] ? row[col[k]] : null);

  // Converter features: se vier TEXT/JSON string, tenta parse
  let features = pick('features');
  if (typeof features === 'string') {
    try { features = JSON.parse(features); } catch { /* deixa string */ }
  }

  return {
    id:             pick('id'),
    name:           pick('name'),
    price:          Number(pick('price') ?? 0),
    currency:       pick('currency') || 'BRL',
    durationType:   pick('durationType') || 'months',
    durationValue:  Number(pick('durationValue') ?? 1),
    analysisLimit:  Number(pick('analysisLimit') ?? 0),
    isPopular:      Boolean(pick('isPopular')),
    isActive:       pick('isActive') === null ? true : Boolean(pick('isActive')),
    features:       features ?? [],
    color:          pick('color') || null,
    createdAt:      pick('createdAt') || null,
    updatedAt:      pick('updatedAt') || null,
  };
}

/** Monta SELECT dinâmico conforme colunas disponíveis */
function buildSelectCols(col) {
  const cols = [];
  for (const key of Object.keys(col)) {
    if (!col[key]) continue;
    // Alia para nome canônico no objeto retornado brute (iremos normalizar de qualquer forma)
    cols.push(`\`${col[key]}\` AS \`${col[key]}\``);
  }
  // Garantir essenciais:
  if (!col.id) cols.push('`id`'); // em última instância tenta id
  if (!col.name) cols.push('`name`');
  if (!col.price) cols.push('`price`');
  if (!col.currency) cols.push('`currency`');
  return cols.join(', ');
}

/** Faz seed se tabela estiver vazia (sem alterar schema) */
async function ensurePlansSeed() {
  const { col } = await getPlansColumns();

  // Checar se há registros
  const [cntRows] = await sequelize.query(`SELECT COUNT(*) AS c FROM \`plans\``);
  const count = Number(Array.isArray(cntRows) ? cntRows[0]?.c : cntRows?.c || 0);
  if (count > 0) return;

  // Definir colunas válidas para INSERT
  const fields = [];
  const pushIf = (key) => { if (col[key]) fields.push(col[key]); };

  pushIf('id');
  pushIf('name');
  pushIf('price');
  pushIf('currency');
  pushIf('durationType');
  pushIf('durationValue');
  pushIf('analysisLimit');
  pushIf('features');
  pushIf('isPopular');
  pushIf('isActive');
  pushIf('color');
  // datas opcionais
  if (col.createdAt) fields.push(col.createdAt);
  if (col.updatedAt) fields.push(col.updatedAt);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const basePlans = [
    {
      id: 'trial',
      name: 'Teste Grátis',
      price: 0,
      currency: 'BRL',
      durationType: 'days',
      durationValue: 7,
      analysisLimit: 3,
      features: JSON.stringify(['3 análises', '7 dias de teste', 'Suporte básico']),
      isPopular: 0,
      isActive: 1,
      color: '#9CA3AF',
    },
    {
      id: 'monthly',
      name: 'Mensal',
      price: 39.90,
      currency: 'BRL',
      durationType: 'months',
      durationValue: 1,
      analysisLimit: 50,
      features: JSON.stringify(['50 análises/mês', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios']),
      isPopular: 0,
      isActive: 1,
      color: '#3B82F6',
    },
    {
      id: 'quarterly',
      name: 'Trimestral',
      price: 99.90,
      currency: 'BRL',
      durationType: 'months',
      durationValue: 3,
      analysisLimit: 200,
      features: JSON.stringify(['200 análises/trimestre', 'Suporte prioritário', 'Histórico completo', 'Exportar relatórios', '17% de desconto']),
      isPopular: 1,
      isActive: 1,
      color: '#10B981',
    },
    {
      id: 'annual',
      name: 'Anual',
      price: 359.90,
      currency: 'BRL',
      durationType: 'months',
      durationValue: 12,
      analysisLimit: 1000,
      features: JSON.stringify(['1000 análises/ano', 'Suporte VIP', 'Histórico ilimitado', 'Exportar relatórios', 'API dedicada', '25% de desconto']),
      isPopular: 0,
      isActive: 1,
      color: '#8B5CF6',
    }
  ];

  // Inserir linha a linha (compatível com qualquer combinação de colunas)
  for (const p of basePlans) {
    const values = [];
    for (const f of fields) {
      switch (f) {
        case col.id: values.push(p.id); break;
        case col.name: values.push(p.name); break;
        case col.price: values.push(p.price); break;
        case col.currency: values.push(p.currency); break;
        case col.durationType: values.push(p.durationType); break;
        case col.durationValue: values.push(p.durationValue); break;
        case col.analysisLimit: values.push(p.analysisLimit); break;
        case col.features: values.push(p.features); break;
        case col.isPopular: values.push(p.isPopular); break;
        case col.isActive: values.push(p.isActive); break;
        case col.color: values.push(p.color); break;
        case col.createdAt: values.push(now); break;
        case col.updatedAt: values.push(now); break;
        default: values.push(null);
      }
    }
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO \`plans\` (${fields.map(f => `\`${f}\``).join(', ')}) VALUES (${placeholders})`;
    await sequelize.query(sql, { replacements: values });
  }
}

/** Util: pega plano por id (normalizado) */
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

/** Calcula endDate a partir de (durationType, durationValue) */
function calculateEndDate(durationType, durationValue) {
  const now = new Date();
  if (durationType === 'days') now.setDate(now.getDate() + Number(durationValue || 0));
  else if (durationType === 'months') now.setMonth(now.getMonth() + Number(durationValue || 0));
  else if (durationType === 'years') now.setFullYear(now.getFullYear() + Number(durationValue || 0));
  return now;
}

/**
 * GET /api/plans
 * Lista planos do banco (detectando snake/camel)
 */
router.get('/', async (req, res) => {
  try {
    await ensurePlansSeed(); // opcional: popula se vazio

    const { col } = await getPlansColumns();
    const colsSel = buildSelectCols(col);
    const [rows] = await sequelize.query(`SELECT ${colsSel} FROM \`plans\` WHERE ${col.isActive ? `\`${col.isActive}\`=1` : '1=1'} ORDER BY ${col.display_order ? `\`${col.display_order}\`` : (col.name ? `\`${col.name}\`` : '1')} ASC`);
    const plans = (rows || []).map(r => normalizePlanRow(r, col));

    res.json({ success: true, plans });
  } catch (error) {
    console.error('Erro ao listar planos:', error);
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

/**
 * GET /api/plans/:planId
 * Retorna um plano específico
 */
router.get('/:planId', async (req, res) => {
  try {
    const plan = await getPlanById(req.params.planId);
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });
    res.json({ success: true, plan });
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    res.status(500).json({ error: 'Erro ao buscar plano' });
  }
});

/**
 * POST /api/plans/upgrade
 * Atualiza assinatura do usuário para um plano, lendo limites do banco
 */
router.post('/upgrade', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan: planId } = req.body;

    const plan = await getPlanById(planId);
    if (!plan) return res.status(400).json({ error: 'Plano inválido' });

    // Busca/Cria assinatura
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
        // reset usage se limite novo for maior que o antigo
        analysisUsed: (plan.analysisLimit > (subscription.analysisLimit || 0)) ? 0 : subscription.analysisUsed
      });
    }

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
        analysisUsed: subscription.analysisUsed
      }
    });
  } catch (error) {
    console.error('Erro ao fazer upgrade de plano:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/plans/cancel
 * Cancela assinatura (mantém ativa até fim do período)
 */
router.post('/cancel', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
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
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
