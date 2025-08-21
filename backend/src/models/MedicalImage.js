const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const MedicalImage = sequelize.define('MedicalImage', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    filename: { type: DataTypes.STRING, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    imageType: {
      type: DataTypes.ENUM('xray', 'mri', 'ct', 'ultrasound', 'photo', 'other'),
      allowNull: false,
      defaultValue: 'photo'
    },
    analysisId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'analyses', key: 'id' }
    }
  }, {
    tableName: 'medical_images',
    timestamps: true
  });
  return MedicalImage;
};
