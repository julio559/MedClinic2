// backend/src/models/index.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const common = {
  dialect: 'mysql',
  logging: false,
  pool: { max: 5, min: 0, acquire: 60000, idle: 10000 },
  dialectOptions: { connectTimeout: 60000 },
};

let sequelize;

// Cloud Run + Cloud SQL (socket) se INSTANCE_CONNECTION_NAME estiver definido
if (process.env.INSTANCE_CONNECTION_NAME) {
  const socketBase = process.env.DB_SOCKET_PATH || '/cloudsql';
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      ...common,
      host: 'localhost',
      dialectOptions: {
        ...common.dialectOptions,
        socketPath: `${socketBase}/${process.env.INSTANCE_CONNECTION_NAME}`,
      },
    }
  );
} else {
  // Dev/local ou outros hosts: TCP/IP
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      ...common,
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
    }
  );
}

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./User')(sequelize, Sequelize);
db.Patient = require('./Patient')(sequelize, Sequelize);
db.Analysis = require('./Analysis')(sequelize, Sequelize);
db.AnalysisResult = require('./AnalysisResult')(sequelize, Sequelize);
db.Subscription = require('./Subscription')(sequelize, Sequelize);
db.MedicalImage = require('./MedicalImage')(sequelize, Sequelize);
db.Plan = require('./Plan')(sequelize, Sequelize);

// Associações
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

// Plan <-> Subscription (Subscription.plan -> Plan.id)
db.Plan.hasMany(db.Subscription, {
  foreignKey: 'plan',
  sourceKey: 'id',
  as: 'Subscriptions',
});
db.Subscription.belongsTo(db.Plan, {
  foreignKey: 'plan',
  targetKey: 'id',
  as: 'Plan',
});

module.exports = db;