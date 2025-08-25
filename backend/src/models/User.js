// backend/src/models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // CHAR(36) no MySQL
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 255] }
    },

    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },

    // ATENÇÃO:
    // Se a coluna REAL no banco for "password_hash", troque o field abaixo.
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password' // ou 'password_hash' se seu banco tiver esse nome
    },

    phone: { type: DataTypes.STRING(50), allowNull: true },

    crm: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true }
    },

    specialty: { type: DataTypes.STRING(120), allowNull: true },
    avatar: { type: DataTypes.TEXT, allowNull: true },

    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: { type: DataTypes.DATE, allowNull: true },

    // opcional: role
    role: { type: DataTypes.STRING(50), allowNull: true }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['crm'] }
    ]
  });

  return User;
};
