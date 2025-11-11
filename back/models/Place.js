const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Place = sequelize.define('Place', {
    place_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    google_place_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    place_type: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    post_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'places',
    timestamps: false,
    indexes: [
      { fields: ['latitude', 'longitude'] },
      { fields: ['google_place_id'] }
    ]
  });

  return Place;
};
