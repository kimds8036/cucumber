const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostLike = sequelize.define('PostLike', {
    like_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    post_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'post_id'
      }
    },
    user_id: {
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
    tableName: 'post_likes',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['post_id', 'user_id']
      },
      { fields: ['post_id'] },
      { fields: ['user_id'] }
    ]
  });

  return PostLike;
};
