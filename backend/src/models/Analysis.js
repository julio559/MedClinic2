// models/Analysis.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Analysis = sequelize.define('Analysis', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(190),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    aiConfidenceScore: {
      type: DataTypes.DECIMAL(3, 2), // 0.00 .. 1.00
      allowNull: true,
      validate: { min: 0, max: 1 }
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: true, // ← opcional
      references: { model: 'patients', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'analyses',
    timestamps: true,
    indexes: [
      { fields: ['doctorId'] },
      { fields: ['patientId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  // Associações
  Analysis.associate = (models) => {
    // Médico dono da análise
    Analysis.belongsTo(models.User, {
      as: 'Doctor',
      foreignKey: 'doctorId',
      targetKey: 'id'
    });

    // Paciente (opcional)
    Analysis.belongsTo(models.Patient, {
      as: 'Patient',
      foreignKey: 'patientId',
      targetKey: 'id',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Resultados da análise
    Analysis.hasMany(models.AnalysisResult, {
      as: 'AnalysisResults',
      foreignKey: 'analysisId',
      sourceKey: 'id',
      onDelete: 'CASCADE',
      hooks: true // garante cascata no destroy() do Sequelize
    });

    // Imagens médicas vinculadas
    Analysis.hasMany(models.MedicalImage, {
      as: 'MedicalImages',
      foreignKey: 'analysisId',
      sourceKey: 'id',
      onDelete: 'CASCADE',
      hooks: true
    });
  };

  return Analysis;
};
