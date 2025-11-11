const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommentLike = sequelize.define('CommentLike', {
    like_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    comment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'comments',
        key: 'comment_id'
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
    tableName: 'comment_likes',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['comment_id', 'user_id']
      },
      { fields: ['comment_id'] },
      { fields: ['user_id'] }
    ]
  });

  return CommentLike;
};
