const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    report_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    target_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['post', 'comment', 'user']]
      }
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    reviewed_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    admin_note: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'reports',
    timestamps: false,
    indexes: [
      { fields: ['reporter_id'] },
      { fields: ['target_type', 'target_id'] },
      { fields: ['status'] }
    ]
  });

  return Report;
};
