const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CanvasDrawing = sequelize.define('CanvasDrawing', {
    drawing_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    place_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'places',
        key: 'place_id'
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
    canvas_x: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    canvas_y: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    width: {
      type: DataTypes.INTEGER,
      defaultValue: 300
    },
    height: {
      type: DataTypes.INTEGER,
      defaultValue: 300
    },
    drawing_data: {
      type: DataTypes.JSONB,
      allowNull: false
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
    tableName: 'canvas_drawings',
    timestamps: false,
    indexes: [
      { fields: ['place_id'] },
      { fields: ['user_id'] },
      { fields: [{ name: 'created_at', order: 'DESC' }] }
    ]
  });

  return CanvasDrawing;
};
