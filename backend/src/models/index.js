// backend/index.prod-db.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const isProd = process.env.NODE_ENV === 'production';

// Em dev/local, carregue backend/.env (ou .env.local se preferir)
if (!isProd) {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('🔧 .env carregado de:', envPath);
  }
}

const ICN       = process.env.INSTANCE_CONNECTION_NAME; // project:region:instance
const DB_NAME   = process.env.DB_NAME;
const DB_USER   = process.env.DB_USER;
const DB_PASS   = process.env.DB_PASSWORD || process.env.DB_PASS;

// Sanidade: todas as ENVs precisam existir
function ensureEnv(name, val) {
  if (!val) throw new Error(`ENV obrigatória ausente: ${name}`);
}
ensureEnv('DB_NAME', DB_NAME);
ensureEnv('DB_USER', DB_USER);
ensureEnv('DB_PASSWORD/DB_PASS', DB_PASS);

// Escolha de rota de conexão (sempre PROD DB)
const socketPath = ICN ? `/cloudsql/${ICN}` : null;
const useSocket  = Boolean(socketPath);

if (isProd) {
  // Em produção: OBRIGATÓRIO usar socket
  ensureEnv('INSTANCE_CONNECTION_NAME', ICN);
  if (!fs.existsSync('/cloudsql')) {
    throw new Error('Socket dir /cloudsql não está montado. Anexe a instância do Cloud SQL ao serviço.');
  }
}

console.log('[DBcfg] mode     =', isProd ? 'prod' : 'local');
console.log('[DBcfg] useSocket=', useSocket, 'socket=', socketPath || '(none)');
console.log('[DBcfg] name     =', DB_NAME);
console.log('[DBcfg] user     =', DB_USER);
console.log('[DBcfg] pass?    =', DB_PASS ? `yes(len=${String(DB_PASS).length})` : 'NO');
if (useSocket) {
  console.log('[DBcfg] /cloudsql exists?', fs.existsSync('/cloudsql'));
  console.log('[DBcfg] socket exists?   ', fs.existsSync(socketPath));
}

const app = express();

// Cria pool (sempre apontando para o banco de prod)
const poolConfig = useSocket
  ? { socketPath, user: DB_USER, password: DB_PASS, database: DB_NAME }
  : { host: '127.0.0.1', port: 3306, user: DB_USER, password: DB_PASS, database: DB_NAME };

const pool = mysql.createPool({
  ...poolConfig,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

app.get('/health', async (req, res) => {
  try {
    const [[v]] = await pool.query('SELECT VERSION() AS version');
    const [[n]] = await pool.query('SELECT DATABASE() AS db');
    const [[u]] = await pool.query('SELECT CURRENT_USER() AS user');
    res.json({
      ok: true,
      mode: isProd ? 'prod' : 'local',
      db: n.db,
      mysql_version: v.version,
      current_user: u.user,
      via: useSocket ? 'unix-socket' : 'tcp-127.0.0.1:3306',
      ts: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = parseInt(process.env.PORT || '8080', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 prod-db index rodando em :${PORT} (rota: /health)`);
});
