// backend/src/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const util = require('util');
require('dotenv').config();

const db = require('./models');

// --- aiService com guard (se quebrar, não derruba o container) ---
let validateOpenAIConfig = () => false;
let testOpenAIConnection = async () => false;
try {
  ({ validateOpenAIConfig, testOpenAIConnection } = require('./services/aiService'));
} catch (e) {
  console.error('⚠️  aiService não pôde ser carregado (seguindo sem IA):', e?.message);
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
});

// IO global
global.socketIO = io;

// Upload dir (ephemeral no Cloud Run)
const uploadDir = path.join(__dirname, 'uploads/medical-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadDir);
}

// Middlewares
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const patientRoutes = require('./routes/patients');
const analysisRoutes = require('./routes/analysis');
const subscriptionRoutes = require('./routes/subscriptions');
const plansRoutes = require('./routes/plans');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/plans', plansRoutes);

app.get('/_ping', (req, res) => {
  const rev = process.env.K_REVISION || 'local';
  res.set('x-revision', rev);
  res.json({ ok: true, revision: rev });
});

// Health check (não bloqueante)
app.get('/health', async (req, res) => {
  try {
    const openaiConfigured = validateOpenAIConfig();
    let openaiConnection = false;
    if (openaiConfigured) {
      openaiConnection = await Promise.race([
        testOpenAIConnection().catch(() => false),
        new Promise((r) => setTimeout(() => r(false), 2000)),
      ]);
    }

    let dbStatus = 'desconhecido';
    try {
      await db.sequelize.query('SELECT 1');
      dbStatus = 'ok';
    } catch {
      dbStatus = 'falhou';
    }

    res.json({
      status: 'OK',
      message: 'Medical AI Backend funcionando!',
      database: dbStatus,
      openai: {
        configured: openaiConfigured,
        connection: openaiConnection,
        status: openaiConfigured && openaiConnection ? 'Funcionando' : 'Configuração necessária',
      },
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        patients: '/api/patients',
        analysis: '/api/analysis',
        subscriptions: '/api/subscriptions',
        plans: '/api/plans',
      },
    });
  } catch (e) {
    res.status(200).json({ status: 'DEGRADED', error: e.message });
  }
});

// Test simples
app.get('/test', (req, res) => {
  res.json({
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health',
      'GET /test-openai',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/patients',
      'POST /api/analysis',
      'GET /api/analysis',
    ],
  });
});

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

/** ---------- Auxiliares de diagnóstico DB ---------- */
async function hasColumn(sequelize, table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as c
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    { replacements: [process.env.DB_NAME, table, column] }
  );
  const c = Array.isArray(rows) ? rows[0]?.c : rows?.c;
  return Number(c || 0) > 0;
}

async function relaxStrictZeroDate(sequelize) {
  const [[row]] = await sequelize.query(`SELECT @@SESSION.sql_mode AS mode`);
  const oldMode = row?.mode || '';
  const newMode = oldMode
    .split(',')
    .filter((m) => m !== 'NO_ZERO_DATE' && m !== 'NO_ZERO_IN_DATE')
    .join(',');
  await sequelize.query(`SET SESSION sql_mode = ?`, { replacements: [newMode] });
  return { oldMode, newMode };
}

async function restoreSqlMode(sequelize, oldMode) {
  try {
    await sequelize.query(`SET SESSION sql_mode = ?`, { replacements: [oldMode] });
  } catch (e) {
    console.log('(info) Falha ao restaurar sql_mode (ok continuar):', e.message);
  }
}

async function fixZeroDatesInTable(sequelize, table) {
  const hasCreated = await hasColumn(sequelize, table, 'createdAt').catch(() => false);
  const hasUpdated = await hasColumn(sequelize, table, 'updatedAt').catch(() => false);
  if (!hasCreated && !hasUpdated) {
    console.log(`(info) ${table}: sem createdAt/updatedAt — ignorado`);
    return;
  }

  let modes;
  try {
    modes = await relaxStrictZeroDate(sequelize);
  } catch (e) {
    console.log(`(warn) Não foi possível alterar sql_mode antes de limpar ${table}:`, e.message);
  }

  try {
    if (hasCreated) {
      await sequelize.query(
        `UPDATE \`${table}\`
            SET \`createdAt\` = NOW()
          WHERE CAST(\`createdAt\` AS CHAR) = '0000-00-00 00:00:00'
             OR \`createdAt\` IS NULL`
      );
    }
    if (hasUpdated) {
      await sequelize.query(
        `UPDATE \`${table}\`
            SET \`updatedAt\` = NOW()
          WHERE CAST(\`updatedAt\` AS CHAR) = '0000-00-00 00:00:00'
             OR \`updatedAt\` IS NULL`
      );
    }
  } catch (e) {
    console.log(`(info) Limpando zero dates: ${table} -> ignorado (${e.message})`);
  } finally {
    if (modes?.oldMode) await restoreSqlMode(sequelize, modes.oldMode);
  }
}

async function ensureDatetimeDefaults(sequelize, table) {
  const hasCreated = await hasColumn(sequelize, table, 'createdAt').catch(() => false);
  const hasUpdated = await hasColumn(sequelize, table, 'updatedAt').catch(() => false);
  if (!hasCreated && !hasUpdated) return;

  try {
    await sequelize.query(
      `ALTER TABLE \`${table}\`
         ${hasCreated ? 'MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' : ''}
         ${hasCreated && hasUpdated ? ',' : ''}
         ${hasUpdated ? 'MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' : ''}`
    );
  } catch (e) {
    console.log(`(info) Ajuste default datetime: ${table} -> ignorado (${e.message})`);
  }
}

async function countZeroDates(sequelize, table) {
  const hasCreated = await hasColumn(sequelize, table, 'createdAt').catch(() => false);
  const hasUpdated = await hasColumn(sequelize, table, 'updatedAt').catch(() => false);
  if (!hasCreated && !hasUpdated) return { table, zeros: 0, note: 'sem createdAt/updatedAt' };

  const [rows] = await sequelize.query(
    `SELECT SUM(
       ${hasCreated ? "CAST(CAST(`createdAt` AS CHAR) = '0000-00-00 00:00:00' AS UNSIGNED)" : '0'}
       ${hasCreated && hasUpdated ? ' + ' : ''}
       ${hasUpdated ? "CAST(CAST(`updatedAt` AS CHAR) = '0000-00-00 00:00:00' AS UNSIGNED)" : '0'}
     ) AS zeros
     FROM \`${table}\``
  );
  const zeros = Array.isArray(rows) ? Number(rows[0]?.zeros || 0) : Number(rows?.zeros || 0);
  return { table, zeros };
}

async function diagnoseDB(sequelize) {
  const [[{ version }]] = await sequelize.query(`SELECT VERSION() AS version`);
  const [[{ mode }]] = await sequelize.query(`SELECT @@SESSION.sql_mode AS mode`);
  const tables = ['users', 'patients', 'analyses', 'analysis_results', 'medical_images', 'subscriptions', 'plans'];

  const zeroReports = [];
  for (const t of tables) {
    try {
      zeroReports.push(await countZeroDates(sequelize, t));
    } catch (e) {
      zeroReports.push({ table: t, error: e.message });
    }
  }
  return { version, sql_mode: mode, zeroDates: zeroReports };
}

async function preSyncCleanupZeroDates(sequelize) {
  const tables = ['users', 'patients', 'analyses', 'analysis_results', 'medical_images', 'subscriptions', 'plans'];
  for (const t of tables) {
    await fixZeroDatesInTable(sequelize, t);
  }
}

// Diag interno (apenas em dev)
if (isDev) {
  app.get('/_diag/db', async (req, res) => {
    try {
      const diag = await diagnoseDB(db.sequelize);
      res.json({ success: true, diag });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

/** ---------- Fim diagnósticos ---------- */

// Erro global
app.use((error, req, res, next) => {
  const payload = { error: 'Erro interno do servidor' };

  if (isDev) {
    payload.meta = {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    };
    if (error?.original) {
      payload.meta.original = {
        message: error.original.message,
        code: error.original.code,
        errno: error.original.errno,
        sqlState: error.original.sqlState,
        sqlMessage: error.original.sqlMessage,
      };
    }
    if (error?.sql) payload.meta.sql = error.sql;
    if (error?.parameters) payload.meta.parameters = error.parameters;
  }

  console.error('❌ Erro global:', util.inspect(error, { depth: 5, colors: true }));
  res.status(500).json(payload);
});

// 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.originalUrl,
    availableEndpoints: ['GET /health', 'GET /test-openai', 'POST /api/auth/login', 'POST /api/auth/register', 'GET /api/patients', 'POST /api/analysis', 'GET /api/analysis'],
  });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('👨‍⚕️ Doctor connected:', socket.id);
  socket.on('join_doctor_room', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
      console.log(`👨‍⚕️ Doctor ${doctorId} joined room`);
    } else {
      console.warn('join_doctor_room sem doctorId');
    }
  });
  socket.on('disconnect', () => console.log('👨‍⚕️ Doctor disconnected:', socket.id));
});

// --- Cloud Run/Containers: escute a porta ANTES de tocar no DB ---
const PORT = parseInt(process.env.PORT || '8080', 10);
server.listen(PORT, '0.0.0.0', () => {
  console.log('=====================================');
  console.log('🚀 Server rodando na porta', PORT);
  console.log('📊 Health check: /health');
  console.log('=====================================\n');
});

// Inicialização do DB em background (skip opcional)
if (process.env.SKIP_DB === '1') {
  console.log('⏭️  SKIP_DB=1: pulando inicialização do banco');
} else {
  (async () => {
    try {
      // 0) Autentica e diagnóstico
      await db.sequelize.authenticate();
      const baseDiag = await diagnoseDB(db.sequelize);
      console.log('🗄️ MySQL versão:', baseDiag.version);
      console.log('⚙️  sql_mode:', baseDiag.sql_mode);
      console.log('🔎 Zero-dates (seguro):', baseDiag.zeroDates);

      // 1) Limpeza zero-dates (tolerante a erro)
      try {
        await preSyncCleanupZeroDates(db.sequelize);
      } catch (e) {
        console.log('(warn) Falha na limpeza de zero-dates (continuando):', e.message);
      }

      // 2) Sync (opcional)
      const ALTER = process.env.DB_SYNC_ALTER === '1';
      await db.sequelize.sync({ force: false, alter: ALTER });

      // 3) Ajustes defaults (opcional)
      if (process.env.DB_FIX_TS_DEFAULTS === '1') {
        const tables = ['users', 'patients', 'analyses', 'analysis_results', 'medical_images', 'subscriptions', 'plans'];
        for (const t of tables) await ensureDatetimeDefaults(db.sequelize, t);
      }

      // 4) Teste OpenAI (não bloqueia startup)
      console.log('🔍 Verificando configuração da OpenAI...');
      const openaiConfigured = validateOpenAIConfig();
      if (openaiConfigured) {
        const openaiConnected = await testOpenAIConnection();
        console.log(openaiConnected ? '✅ OpenAI totalmente funcional' : '⚠️  OpenAI com problemas de conexão');
      } else {
        console.log('⚠️  OpenAI não configurada - modo limitado');
      }

      console.log('✅ Bootstrap de DB concluído');
    } catch (error) {
      console.error('❌ Falha ao inicializar DB (server segue de pé):', error?.message);
    }
  })();
}

// Captura erros não tratados
process.on('unhandledRejection', (reason, p) => {
  console.error('🧨 Unhandled Rejection at:', p, '\nReason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🧨 Uncaught Exception:', err);
});

module.exports = app;
