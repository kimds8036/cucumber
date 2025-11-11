const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PhoneVerification = sequelize.define('PhoneVerification', {
    verification_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    verification_code: {
      type: DataTypes.STRING(6),
      allowNull: true
    },
    verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'phone_verifications',
    timestamps: false,
    indexes: [
      { fields: ['phone_number'] },
      { fields: ['user_id'] }
    ]
  });

  return PhoneVerification;
};
