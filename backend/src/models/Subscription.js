// backend/src/models/Subscription.js
module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.UUID, allowNull: false },

    // Usa a coluna existente `plan` (string) apontando para Plan.id
    plan: { type: DataTypes.STRING, allowNull: false },

    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'active'
    },
    startDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    endDate: { type: DataTypes.DATE, allowNull: false },

    analysisLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    analysisUsed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, {
    tableName: 'subscriptions',
    timestamps: true
  });

  return Subscription;
};
