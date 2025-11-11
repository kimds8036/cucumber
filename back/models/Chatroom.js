const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chatroom = sequelize.define('Chatroom', {
    chatroom_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user1_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    user2_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    last_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: 'chatrooms',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['user1_id', 'user2_id']
      },
      { fields: ['user1_id'] },
      { fields: ['user2_id'] },
      { fields: [{ name: 'last_message_at', order: 'DESC' }] }
    ],
    validate: {
      checkUserOrder() {
        if (this.user1_id >= this.user2_id) {
          throw new Error('user1_id must be less than user2_id');
        }
      }
    }
  });

  return Chatroom;
};
