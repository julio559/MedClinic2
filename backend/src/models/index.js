// backend/src/models/index.js
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
const { Sequelize, DataTypes } = require('sequelize');

const DB_NAME  = process.env.DB_NAME  || process.env.MYSQL_DATABASE || 'medclinic';
const DB_USER  = process.env.DB_USER  || process.env.MYSQL_USER     || 'root';
const DB_PASS  = process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQL_PASSWORD || '';
const DB_HOST  = process.env.DB_HOST  || process.env.MYSQL_HOST     || '127.0.0.1';
const DB_PORT  = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
const ICN      = process.env.INSTANCE_CONNECTION_NAME; // project:region:instance
const SOCKET   = process.env.DB_SOCKET_PATH || (ICN ? `/cloudsql/${ICN}` : null);

const useSocket = Boolean(SOCKET);
const isProd = process.env.NODE_ENV === 'production';

// Diagnóstico
console.log('[DBcfg] useSocket=', useSocket, 'socket=', SOCKET || '(none)');
console.log('[DBcfg] name=', DB_NAME, 'user=', DB_USER);
console.log('[DBcfg] host=', useSocket ? '(socket)' : DB_HOST, 'port=', useSocket ? '(socket)' : DB_PORT);
console.log('[DBcfg] password set? ', DB_PASS ? `yes(len=${String(DB_PASS).length})` : 'NO');
if (useSocket) {
  console.log('[DBcfg] ICN=', ICN);
  try {
    console.log('[DBcfg] /cloudsql exists?', fs.existsSync('/cloudsql'));
    if (SOCKET) console.log('[DBcfg] socket path exists?', fs.existsSync(SOCKET));
  } catch {}
}

// Trava: em produção, sem socket = erro explícito
if (isProd && !useSocket) {
  throw new Error(
    'Produção sem socket do Cloud SQL. Verifique INSTANCE_CONNECTION_NAME e a conexão Cloud SQL anexada ao serviço.'
  );
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  dialect: 'mysql',
  dialectModule: mysql,
  logging: false,
  define: { timestamps: true },
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  retry: {
    match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNRESET/, /SequelizeConnectionError/],
    max: 3,
  },
  ...(useSocket
    ? { dialectOptions: { socketPath: SOCKET, dateStrings: true } }
    : { host: DB_HOST, port: DB_PORT, dialectOptions: { dateStrings: true } }
  ),
});

// Loader de models
const db = {};
const basename = path.basename(__filename);

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.toLowerCase().endsWith('.js'))
  .forEach((file) => {
    const mod = require(path.join(__dirname, file));
    try {
      const model = typeof mod === 'function' ? mod(sequelize, DataTypes) : mod.default?.(sequelize, DataTypes);
      if (model?.name) db[model.name] = model;
    } catch (e) {
      console.error(`[models] Falha ao carregar ${file}:`, e.message);
    }
  });

Object.keys(db).forEach((name) => {
  if (typeof db[name].associate === 'function') {
    try { db[name].associate(db); } catch (e) {
      console.error(`[models] Falha ao associar ${name}:`, e.message);
    }
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
