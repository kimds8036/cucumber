const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BoardType = sequelize.define('BoardType', {
    type_code: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
      unique: true
    },
    requires_student_auth: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'board_types',
    timestamps: false
  });

  return BoardType;
};
