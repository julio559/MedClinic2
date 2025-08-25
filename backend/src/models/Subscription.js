const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, Sequelize) => {
  const { DataTypes } = Sequelize;

  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
      defaultValue: () => uuidv4(),   // gera UUID no create
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      field: 'userId',               // se no DB for 'user_id', troque aqui
    },
    plan: { type: DataTypes.STRING(64), allowNull: false },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'active'
    },
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate:   { type: DataTypes.DATE, allowNull: true },
    analysisLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    analysisUsed:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, {
    tableName: 'subscriptions',
    timestamps: true
  });

  return Subscription;
};
