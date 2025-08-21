const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Analysis = sequelize.define('Analysis', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [3, 255] }
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    symptoms: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    aiConfidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 1 }
    },
    patientId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'patients', key: 'id' }
    },
    doctorId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'analyses',
    timestamps: true
  });
  return Analysis;
};
