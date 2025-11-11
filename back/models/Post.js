const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    post_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    board_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'board_types',
        key: 'type_code'
      }
    },
    school_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'schools',
        key: 'school_id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'places',
        key: 'place_id'
      }
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    view_count: {
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
    tableName: 'posts',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['board_type'] },
      { fields: ['school_id'] },
      { fields: [{ name: 'created_at', order: 'DESC' }] },
      { fields: ['is_deleted'] },
      { 
        fields: ['board_type', 'school_id'],
        where: { is_deleted: false }
      },
      {
        fields: [
          { name: 'created_at', order: 'DESC' },
          { name: 'like_count', order: 'DESC' }
        ],
        where: { is_deleted: false }
      }
    ]
  });

  return Post;
};
