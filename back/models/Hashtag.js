const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Hashtag = sequelize.define('Hashtag', {
    hashtag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tag: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    use_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'hashtags',
    timestamps: false,
    indexes: [
      { fields: ['tag'] },
      { fields: [{ name: 'use_count', order: 'DESC' }] }
    ]
  });

  return Hashtag;
};
