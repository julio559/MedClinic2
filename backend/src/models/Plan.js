module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'BRL',
    },
    // usando snake_case no DB com underscored
    duration_type: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'months',
    },
    duration_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    analysis_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    features: {
      type: DataTypes.TEXT, // pode ser JSON em string
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
  }, {
    tableName: 'plans',
    timestamps: true,
    underscored: true, // created_at / updated_at
  });

  Plan.associate = (models) => {
    // se quiser, pode associar com Subscription (1:N)
    if (models.Subscription) {
      Plan.hasMany(models.Subscription, { foreignKey: 'plan', sourceKey: 'id' });
    }
  };

  return Plan;
};
