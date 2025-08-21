const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    plan: {
      type: DataTypes.ENUM('trial', 'monthly', 'quarterly', 'annual'),
      allowNull: false,
      defaultValue: 'trial'
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired'),
      defaultValue: 'active'
    },
    startDate: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    endDate: { type: DataTypes.DATE, allowNull: false },
    analysisLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
    analysisUsed: { type: DataTypes.INTEGER, defaultValue: 0 },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true
  });
  return Subscription;
};
