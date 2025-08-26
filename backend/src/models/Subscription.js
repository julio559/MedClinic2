module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.STRING(64), // usa UUID string
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'userId', // ou 'user_id' se sua tabela estiver em snake_case diferente
    },
    plan: {
      type: DataTypes.STRING(64), // referencia Plan.id
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'active',
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'startDate',
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'endDate',
    },
    analysisLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'analysisLimit',
    },
    analysisUsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'analysisUsed',
    },
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: false, // colunas parecem camelCase na sua base
  });

  Subscription.associate = (models) => {
    if (models.User) {
      Subscription.belongsTo(models.User, { foreignKey: 'userId' });
    }
    if (models.Plan) {
      // associação opcional por chave lógica (plan string -> Plan.id)
      Subscription.belongsTo(models.Plan, { foreignKey: 'plan', targetKey: 'id', as: 'PlanDetails' });
    }
  };

  return Subscription;
};
