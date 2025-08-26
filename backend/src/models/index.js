const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'medclinic';
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'root';
const DB_PASS = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
  define: { timestamps: true },
  dialectOptions: { dateStrings: true },
});

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
