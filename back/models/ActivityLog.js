const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    log_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    activity_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    target_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    target_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'activity_logs',
    timestamps: false,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['activity_type'] },
      { fields: ['created_at'] }
    ]
  });

  return ActivityLog;
};
