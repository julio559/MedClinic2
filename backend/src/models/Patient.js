const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.STRING,
      defaultValue: () => uuidv4(),
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true, len: [2, 255] }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true }
    },
    phone: { type: DataTypes.STRING, allowNull: true },
    birthDate: { type: DataTypes.DATE, allowNull: true },
    gender: { type: DataTypes.ENUM('M', 'F', 'Other'), allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    medicalHistory: { type: DataTypes.TEXT, allowNull: true },
    allergies: { type: DataTypes.TEXT, allowNull: true },
    doctorId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    }
  }, {
    tableName: 'patients',
    timestamps: true
  });
  return Patient;
};
