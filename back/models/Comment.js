const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
    comment_id: {
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
    parent_comment_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'comments',
        key: 'comment_id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'comments',
    timestamps: false,
    indexes: [
      { fields: ['post_id'] },
      { fields: ['user_id'] },
      { fields: ['parent_comment_id'] },
      { fields: ['created_at'] },
      { fields: ['is_deleted'] }
    ]
  });

  return Comment;
};
