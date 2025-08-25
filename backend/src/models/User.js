// backend/src/models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4, // gera UUID no MySQL como CHAR(36)
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

    // IMPORTANTE: o banco continua com a coluna 'password'
    // mas no código usamos 'passwordHash'.
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password' // mapeia para a coluna existente
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
    lastLogin: { type: DataTypes.DATE, allowNull: true }
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
