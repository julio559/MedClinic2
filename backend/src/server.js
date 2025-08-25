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
const { validateOpenAIConfig, testOpenAIConnection } = require('./services/aiService');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] }
});

// Disponibiliza o IO globalmente (para uso no aiService, etc.)
global.socketIO = io;

// Verificar e criar diretório de uploads
const uploadDir = path.join(__dirname, 'uploads/medical-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Diretório de uploads criado:', uploadDir);
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos (uploads)
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

// Health check
app.get('/health', async (req, res) => {
  const openaiConfigured = validateOpenAIConfig();
  let openaiConnection = false;
  if (openaiConfigured) openaiConnection = await testOpenAIConnection();

  res.json({
    status: 'OK',
    message: 'Medical AI Backend funcionando!',
    database: 'MySQL conectado',
    openai: {
      configured: openaiConfigured,
      connection: openaiConnection,
      status: openaiConfigured && openaiConnection ? 'Funcionando' : 'Configuração necessária'
    },
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      patients: '/api/patients',
      analysis: '/api/analysis',
      subscriptions: '/api/subscriptions',
      plans: '/api/plans'
    }
  });
});

// Teste OpenAI
app.get('/test-openai', async (req, res) => {
  try {
    const configured = validateOpenAIConfig();
    if (!configured) {
      return res.status(400).json({
        error: 'OpenAI não configurada',
        message: 'Configure OPENAI_API_KEY no arquivo .env'
      });
    }
    const connected = await testOpenAIConnection();
    if (!connected) {
      return res.status(500).json({
        error: 'Falha na conexão com OpenAI',
        message: 'Verifique se a chave da API está correta e ativa'
      });
    }
    res.json({ success: true, message: 'OpenAI configurada e funcionando!', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao testar OpenAI', details: error.message });
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
      'GET /api/analysis'
    ]
  });
});

const isDev = (process.env.NODE_ENV || 'development') !== 'production';

/** ---------- Diagnósticos e utilitários de DB ---------- */

/** Checa se coluna existe via INFORMATION_SCHEMA */
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

/** Remove temporariamente NO_ZERO_DATE/NO_ZERO_IN_DATE desta sessão */
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

/** Restaura sql_mode da sessão */
async function restoreSqlMode(sequelize, oldMode) {
  try {
    await sequelize.query(`SET SESSION sql_mode = ?`, { replacements: [oldMode] });
  } catch (e) {
    console.log('(info) Falha ao restaurar sql_mode (ok continuar):', e.message);
  }
}

/** Corrige zero-dates tabela/colunas com CAST para evitar erro em STRICT */
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

/** Ajusta defaults DATETIME (opcional via ENV) */
async function ensureDatetimeDefaults(sequelize, table) {
  const hasCreated = await hasColumn(sequelize, table, 'createdAt').catch(() => false);
  const hasUpdated = await hasColumn(sequelize, table, 'updatedAt').catch(() => false);
  if (!hasCreated && !hasUpdated) return;

  try {
    await sequelize.query(
      `ALTER TABLE \`${table}\`
         ${hasCreated ? "MODIFY `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP" : ""}
         ${hasCreated && hasUpdated ? "," : ""}
         ${hasUpdated ? "MODIFY `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" : ""}`
    );
  } catch (e) {
    console.log(`(info) Ajuste default datetime: ${table} -> ignorado (${e.message})`);
  }
}

/** Conta zero-dates de forma segura (CAST) */
async function countZeroDates(sequelize, table) {
  const hasCreated = await hasColumn(sequelize, table, 'createdAt').catch(() => false);
  const hasUpdated = await hasColumn(sequelize, table, 'updatedAt').catch(() => false);
  if (!hasCreated && !hasUpdated) return { table, zeros: 0, note: 'sem createdAt/updatedAt' };

  const [rows] = await sequelize.query(
    `SELECT SUM(
       ${hasCreated ? "CAST(CAST(`createdAt` AS CHAR) = '0000-00-00 00:00:00' AS UNSIGNED)" : "0"}
       ${hasCreated && hasUpdated ? " + " : ""}
       ${hasUpdated ? "CAST(CAST(`updatedAt` AS CHAR) = '0000-00-00 00:00:00' AS UNSIGNED)" : "0"}
     ) AS zeros
     FROM \`${table}\``
  );
  const zeros = Array.isArray(rows) ? Number(rows[0]?.zeros || 0) : Number(rows?.zeros || 0);
  return { table, zeros };
}

/** Diagnóstico do banco (versão, sql_mode, zero-dates) */
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

/** Corrige zero-dates em todas as tabelas conhecidas */
async function preSyncCleanupZeroDates(sequelize) {
  const tables = [
    'users',
    'patients',
    'analyses',
    'analysis_results',
    'medical_images',
    'subscriptions',
    'plans'
  ];
  for (const t of tables) {
    await fixZeroDatesInTable(sequelize, t);
  }
}

/** Rota de diagnóstico interna (apenas dev) */
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

// Erro global (resposta detalhada em dev)
app.use((error, req, res, next) => {
  const payload = {
    error: 'Erro interno do servidor',
  };

  if (isDev) {
    payload.meta = {
      name: error?.name,
      message: error?.message,
      stack: (error && error.stack) || undefined,
    };

    // Enriquecer com detalhes de Sequelize, se houver
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
    availableEndpoints: ['GET /health', 'GET /test-openai', 'POST /api/auth/login', 'POST /api/auth/register', 'GET /api/patients', 'POST /api/analysis', 'GET /api/analysis']
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

const PORT = process.env.PORT || 8080;

/** Bootstrap */
async function bootstrap() {
  try {
    // 0) Autentica para garantir conexão (log vers/ modo SQL)
    await db.sequelize.authenticate();
    const baseDiag = await diagnoseDB(db.sequelize);
    console.log('🗄️ MySQL versão:', baseDiag.version);
    console.log('⚙️  sql_mode:', baseDiag.sql_mode);
    console.log('🔎 Zero-dates (seguro):', baseDiag.zeroDates);

    // 1) Corrige zero-dates antes do sync (tolerante a erro)
    try {
      await preSyncCleanupZeroDates(db.sequelize);
    } catch (e) {
      console.log('(warn) Falha na limpeza de zero-dates (continuando):', e.message);
    }

    // 2) OPCIONAL: permitir ALTER via env
    const ALTER = process.env.DB_SYNC_ALTER === '1';
    await db.sequelize.sync({ force: false, alter: ALTER });

    // 3) OPCIONAL: forçar defaults saudáveis em DATETIME via env
    if (process.env.DB_FIX_TS_DEFAULTS === '1') {
      const tables = ['users','patients','analyses','analysis_results','medical_images','subscriptions','plans'];
      for (const t of tables) await ensureDatetimeDefaults(db.sequelize, t);
    }

    // 4) Teste OpenAI
    console.log('🔍 Verificando configuração da OpenAI...');
    const openaiConfigured = validateOpenAIConfig();
    if (openaiConfigured) {
      const openaiConnected = await testOpenAIConnection();
      console.log(openaiConnected ? '✅ OpenAI totalmente funcional' : '⚠️  OpenAI configurada mas com problemas de conexão');
    } else {
      console.log('⚠️  OpenAI não configurada - sistema funcionará em modo limitado');
      console.log('💡 Para usar IA real, adicione OPENAI_API_KEY no arquivo .env');
    }

    // 5) Sobe servidor
    server.listen(PORT, () => {
      console.log('=====================================');
      console.log('🚀 Server rodando na porta', PORT);
      console.log('🗄️ MySQL conectado:', process.env.DB_NAME);
      console.log('🤖 OpenAI:', openaiConfigured ? '✅ Configurada' : '❌ Não configurada');
      console.log('📊 Health check: http://localhost:' + PORT + '/health');
      if (isDev) console.log('🛠️  Diagnóstico DB: http://localhost:' + PORT + '/_diag/db');
      console.log('🧪 Test OpenAI: http://localhost:' + PORT + '/test-openai');
      console.log('🧪 Test: http://localhost:' + PORT + '/test');
      console.log('📁 Upload dir:', uploadDir);
      console.log('🔗 Socket.IO: Habilitado');
      console.log('=====================================\n');

      console.log('📋 Endpoints disponíveis:');
      console.log('  Auth:');
      console.log('    POST /api/auth/login');
      console.log('    POST /api/auth/register');
      console.log('  Patients:');
      console.log('    GET /api/patients');
      console.log('    POST /api/patients');
      console.log('  Analysis:');
      console.log('    GET /api/analysis');
      console.log('    POST /api/analysis');
      console.log('    GET /api/analysis/:id/results');
      console.log('    GET /api/analysis/:id/status');
      console.log('    POST /api/analysis/:id/reprocess');
      console.log('  Subscriptions:');
      console.log('    GET /api/subscriptions');
      console.log('    POST /api/subscriptions/upgrade');
      console.log('  Plans:');
      console.log('    GET /api/plans');
      console.log('=====================================\n');
    });
  } catch (error) {
    // Erro de bootstrap mais detalhado
    console.error('❌ Erro ao subir o servidor!');
    console.error('Mensagem:', error?.message);
    if (error?.original) {
      console.error('Original.message:', error.original.message);
      console.error('Original.code:', error.original.code);
      console.error('Original.errno:', error.original.errno);
      console.error('Original.sqlState:', error.original.sqlState);
      console.error('Original.sqlMessage:', error.original.sqlMessage);
    }
    if (error?.sql) console.error('SQL:', error.sql);
    console.error('Stack:', error?.stack);

    // Se falhar por zero-date, dica rápida:
    if (String(error?.message).includes('Incorrect datetime value')) {
      console.error('💡 Dica: há valores "0000-00-00 00:00:00" no seu banco. ');
      console.error('   Rode a limpeza segura (CAST) ou ative DB_SYNC_ALTER/DB_FIX_TS_DEFAULTS se precisar ajustar schema.');
      if (isDev) console.error('   Rota de diagnóstico (dev): GET /_diag/db');
    }

    process.exit(1);
  }
}

bootstrap();

// Captura erros não tratados
process.on('unhandledRejection', (reason, p) => {
  console.error('🧨 Unhandled Rejection at:', p, '\nReason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('🧨 Uncaught Exception:', err);
});

module.exports = app;
