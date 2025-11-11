const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Block = sequelize.define('Block', {
    block_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    blocker_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    blocked_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'blocks',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['blocker_id', 'blocked_id']
      },
      { fields: ['blocker_id'] },
      { fields: ['blocked_id'] }
    ]
  });

  return Block;
};
