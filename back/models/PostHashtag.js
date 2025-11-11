const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PostHashtag = sequelize.define('PostHashtag', {
    post_hashtag_id: {
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
    hashtag_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'hashtags',
        key: 'hashtag_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'post_hashtags',
    timestamps: false,
    indexes: [
      { 
        unique: true,
        fields: ['post_id', 'hashtag_id']
      },
      { fields: ['post_id'] },
      { fields: ['hashtag_id'] }
    ]
  });

  return PostHashtag;
};
