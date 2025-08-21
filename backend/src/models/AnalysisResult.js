const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AnalysisResult = sequelize.define('AnalysisResult', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true }
    },
    result: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true }
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: { min: 0, max: 1 }
    },
    aiModel: { type: DataTypes.STRING, allowNull: true },
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    analysisId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'analyses', key: 'id' }
    }
  }, {
    tableName: 'analysis_results',
    timestamps: true
  });
  return AnalysisResult;
};
