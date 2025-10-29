// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // DB 연결 설정

const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true, // 소셜 로그인 시 NULL 가능
    field: 'password_hash'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  profile_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'profile_image_url'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // 소셜 로그인 정보
  social_provider: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['google', 'apple', 'email']]
    },
    field: 'social_provider'
  },
  social_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'social_id'
  },
  
  // 학생 인증 관련
  is_student: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_student'
  },
  school_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'school_id'
    },
    field: 'school_id'
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 3
    }
  },
  verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },
  
  // 계정 관리
  nickname_changed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'nickname_changed_at'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deleted_at'
  },
  
  // 추가 정보 (MongoDB 예시에서 가져온 필드들)
  ip_address: {
    type: DataTypes.STRING(45), // IPv6 지원
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  operating_system: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'operating_system'
  },
  browser: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  referrer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true, // soft delete 활성화
  deletedAt: 'deleted_at',
  underscored: true, // snake_case 사용
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['nickname']
    },
    {
      fields: ['school_id']
    },
    {
      fields: ['is_student']
    },
    {
      fields: ['social_provider', 'social_id']
    }
  ]
});

// Hooks (Middleware)
User.beforeSave((user, options) => {
  user.updated_at = new Date();
});

// 인스턴스 메서드
User.prototype.canChangeNickname = function() {
  if (!this.nickname_changed_at) return true;
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  return this.nickname_changed_at < oneMonthAgo;
};

// 클래스 메서드
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByNickname = function(nickname) {
  return this.findOne({ where: { nickname } });
};

User.findStudentsBySchool = function(schoolId) {
  return this.findAll({
    where: {
      is_student: true,
      school_id: schoolId
    }
  });
};

module.exports = User;
