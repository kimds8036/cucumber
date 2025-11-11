const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const School = sequelize.define('School', {
    school_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    school_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    total_students: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    total_posts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'schools',
    timestamps: false,
    indexes: [
      { fields: ['name'] },
      { fields: ['region'] }
    ]
  });

  return School;
};
