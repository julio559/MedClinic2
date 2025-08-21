// backend/src/models/Plan.js
module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  // OBS: timestamps: false para NÃO criar createdAt/updatedAt na tabela `plans`
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.STRING, // 'trial', 'monthly', 'quarterly', 'annual'
      primaryKey: true
    },
    name: { type: DataTypes.STRING(100), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
    durationType: {
      type: DataTypes.ENUM('days', 'months', 'years'),
      allowNull: false
    },
    durationValue: { type: DataTypes.INTEGER, allowNull: false },
    analysisLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    features: { type: DataTypes.JSON, allowNull: true },
    isPopular: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'plans',
    timestamps: false // MUITO IMPORTANTE: evita o Sequelize tentar criar createdAt/updatedAt
  });

  return Plan;
};
