module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define('Patient', {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    medicalHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    allergies: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    doctorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'doctorId', // ou 'doctor_id' se sua tabela estiver em snake_case
    },
  }, {
    tableName: 'patients',
    timestamps: true, // createdAt / updatedAt
  });

  Patient.associate = (models) => {
    // Paciente pertence a um médico (User)
    if (models.User) {
      Patient.belongsTo(models.User, {
        foreignKey: 'doctorId',
        as: 'Doctor',
      });
    }
    // Paciente tem várias análises
    if (models.Analysis) {
      Patient.hasMany(models.Analysis, {
        foreignKey: 'patientId',
        as: 'Analyses',
      });
    }
  };

  return Patient;
};
