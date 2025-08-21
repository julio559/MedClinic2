// backend/src/models/index.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./User')(sequelize, Sequelize);
db.Patient = require('./Patient')(sequelize, Sequelize);
db.Analysis = require('./Analysis')(sequelize, Sequelize);
db.AnalysisResult = require('./AnalysisResult')(sequelize, Sequelize);
db.Subscription = require('./Subscription')(sequelize, Sequelize);
db.MedicalImage = require('./MedicalImage')(sequelize, Sequelize);

// >>> NOVO: Plan
db.Plan = require('./Plan')(sequelize, Sequelize);

// Associations existentes
db.User.hasMany(db.Patient, { foreignKey: 'doctorId' });
db.Patient.belongsTo(db.User, { foreignKey: 'doctorId', as: 'doctor' });

db.Patient.hasMany(db.Analysis, { foreignKey: 'patientId' });
db.Analysis.belongsTo(db.Patient, { foreignKey: 'patientId' });

db.User.hasMany(db.Analysis, { foreignKey: 'doctorId' });
db.Analysis.belongsTo(db.User, { foreignKey: 'doctorId', as: 'doctor' });

db.Analysis.hasMany(db.AnalysisResult, { foreignKey: 'analysisId' });
db.AnalysisResult.belongsTo(db.Analysis, { foreignKey: 'analysisId' });

db.Analysis.hasMany(db.MedicalImage, { foreignKey: 'analysisId' });
db.MedicalImage.belongsTo(db.Analysis, { foreignKey: 'analysisId' });

db.User.hasOne(db.Subscription, { foreignKey: 'userId' });
db.Subscription.belongsTo(db.User, { foreignKey: 'userId' });

// >>> NOVAS associações: Plan <-> Subscription pela coluna `plan` (string)
db.Plan.hasMany(db.Subscription, {
  foreignKey: 'plan',        // coluna de Subscription
  sourceKey: 'id',           // coluna de Plan
  as: 'Subscriptions'
});
db.Subscription.belongsTo(db.Plan, {
  foreignKey: 'plan',        // coluna de Subscription
  targetKey: 'id',           // coluna de Plan
  as: 'Plan'
});

module.exports = db;
