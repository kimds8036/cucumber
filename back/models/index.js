const { Sequelize } = require('sequelize');

// Sequelize 인스턴스 생성
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 모델 import
const User = require('./User')(sequelize);
const School = require('./School')(sequelize);
const PhoneVerification = require('./PhoneVerification')(sequelize);
const BoardType = require('./BoardType')(sequelize);
const Place = require('./Place')(sequelize);
const Post = require('./Post')(sequelize);
const Hashtag = require('./Hashtag')(sequelize);
const PostHashtag = require('./PostHashtag')(sequelize);
const Comment = require('./Comment')(sequelize);
const PostLike = require('./PostLike')(sequelize);
const CommentLike = require('./CommentLike')(sequelize);
const CanvasDrawing = require('./CanvasDrawing')(sequelize);
const Chatroom = require('./Chatroom')(sequelize);
const Message = require('./Message')(sequelize);
const Report = require('./Report')(sequelize);
const Block = require('./Block')(sequelize);
const Notification = require('./Notification')(sequelize);
const ActivityLog = require('./ActivityLog')(sequelize);

// 관계 설정

// User 관계
User.belongsTo(School, { foreignKey: 'school_id' });
School.hasMany(User, { foreignKey: 'school_id' });

User.hasMany(Post, { foreignKey: 'user_id' });
Post.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Comment, { foreignKey: 'user_id' });
Comment.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(PostLike, { foreignKey: 'user_id' });
PostLike.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CommentLike, { foreignKey: 'user_id' });
CommentLike.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CanvasDrawing, { foreignKey: 'user_id' });
CanvasDrawing.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id' });

User.hasMany(Report, { as: 'ReportsCreated', foreignKey: 'reporter_id' });
User.hasMany(Report, { as: 'ReportsReviewed', foreignKey: 'reviewed_by' });
Report.belongsTo(User, { as: 'Reporter', foreignKey: 'reporter_id' });
Report.belongsTo(User, { as: 'Reviewer', foreignKey: 'reviewed_by' });

User.hasMany(Block, { as: 'BlocksCreated', foreignKey: 'blocker_id' });
User.hasMany(Block, { as: 'BlocksReceived', foreignKey: 'blocked_id' });
Block.belongsTo(User, { as: 'Blocker', foreignKey: 'blocker_id' });
Block.belongsTo(User, { as: 'Blocked', foreignKey: 'blocked_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(ActivityLog, { foreignKey: 'user_id' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id' });

// PhoneVerification 관계
PhoneVerification.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(PhoneVerification, { foreignKey: 'user_id' });

// Post 관계
Post.belongsTo(BoardType, { foreignKey: 'board_type', targetKey: 'type_code' });
BoardType.hasMany(Post, { foreignKey: 'board_type', sourceKey: 'type_code' });

Post.belongsTo(School, { foreignKey: 'school_id' });
School.hasMany(Post, { foreignKey: 'school_id' });

Post.belongsTo(Place, { foreignKey: 'place_id' });
Place.hasMany(Post, { foreignKey: 'place_id' });

Post.hasMany(Comment, { foreignKey: 'post_id' });
Comment.belongsTo(Post, { foreignKey: 'post_id' });

Post.hasMany(PostLike, { foreignKey: 'post_id' });
PostLike.belongsTo(Post, { foreignKey: 'post_id' });

// Post와 Hashtag N:N 관계
Post.belongsToMany(Hashtag, { 
  through: PostHashtag, 
  foreignKey: 'post_id',
  otherKey: 'hashtag_id'
});
Hashtag.belongsToMany(Post, { 
  through: PostHashtag, 
  foreignKey: 'hashtag_id',
  otherKey: 'post_id'
});

// Comment 관계
Comment.hasMany(CommentLike, { foreignKey: 'comment_id' });
CommentLike.belongsTo(Comment, { foreignKey: 'comment_id' });

Comment.hasMany(Comment, { as: 'Replies', foreignKey: 'parent_comment_id' });
Comment.belongsTo(Comment, { as: 'ParentComment', foreignKey: 'parent_comment_id' });

// Place 관계
Place.hasMany(CanvasDrawing, { foreignKey: 'place_id' });
CanvasDrawing.belongsTo(Place, { foreignKey: 'place_id' });

// Chatroom 관계
Chatroom.belongsTo(User, { as: 'User1', foreignKey: 'user1_id' });
Chatroom.belongsTo(User, { as: 'User2', foreignKey: 'user2_id' });

Chatroom.hasMany(Message, { foreignKey: 'chatroom_id' });
Message.belongsTo(Chatroom, { foreignKey: 'chatroom_id' });

// Export
module.exports = {
  sequelize,
  User,
  School,
  PhoneVerification,
  BoardType,
  Place,
  Post,
  Hashtag,
  PostHashtag,
  Comment,
  PostLike,
  CommentLike,
  CanvasDrawing,
  Chatroom,
  Message,
  Report,
  Block,
  Notification,
  ActivityLog
};
