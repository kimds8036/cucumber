// app.js 또는 server.js에서 사용 예시

const express = require('express');
const sequelize = require('./config/database');
const User = require('./models/User');

const app = express();
app.use(express.json());

// ========================================
// 데이터베이스 동기화 및 서버 시작
// ========================================
const startServer = async () => {
  try {
    // 데이터베이스 연결 테스트
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 연결 성공!');
    
    // 테이블 동기화 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true }); // 기존 테이블 수정
      // await sequelize.sync({ force: true }); // 테이블 삭제 후 재생성 (주의!)
      console.log('✅ 테이블 동기화 완료!');
    }
    
    // 서버 시작
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
};

// ========================================
// API 라우트 예시
// ========================================

// 예시
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 오이(오늘의 이야기) API 서버가 실행 중입니다!',
    status: 'OK',
    database: 'Connected'
  });
});

// 1. 일반 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email,
      password,
      nickname,
      ipAddress,
      userAgent,
      operatingSystem,
      browser,
      platform,
      language,
      location
    } = req.body;
    
    // 이메일 중복 체크
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    
    // 닉네임 중복 체크
    const existingNickname = await User.findByNickname(nickname);
    if (existingNickname) {
      return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });
    }
    
    // 비밀번호 해싱 (bcrypt 사용)
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    
    // 사용자 생성
    const user = await User.create({
      email,
      password_hash,
      nickname,
      social_provider: 'email',
      ip_address: ipAddress,
      user_agent: userAgent,
      operating_system: operatingSystem,
      browser,
      platform,
      language,
      location
    });
    
    res.status(201).json({
      message: '회원가입 성공!',
      user: {
        user_id: user.user_id,
        email: user.email,
        nickname: user.nickname
      }
    });
  } catch (error) {
    console.error('회원가입 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 2. 소셜 로그인 (Google)
app.post('/api/auth/social-login', async (req, res) => {
  try {
    const { email, social_id, social_provider, nickname } = req.body;
    
    // 기존 사용자 찾기
    let user = await User.findOne({
      where: {
        social_provider,
        social_id
      }
    });
    
    // 없으면 새로 생성
    if (!user) {
      user = await User.create({
        email,
        social_id,
        social_provider,
        nickname,
        password_hash: null // 소셜 로그인은 비밀번호 없음
      });
    }
    
    res.json({
      message: '로그인 성공!',
      user: {
        user_id: user.user_id,
        email: user.email,
        nickname: user.nickname,
        is_student: user.is_student
      }
    });
  } catch (error) {
    console.error('소셜 로그인 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 3. 학생 인증
app.post('/api/auth/verify-student', async (req, res) => {
  try {
    const { user_id, school_id, grade } = req.body;
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 이미 학생 인증된 경우
    if (user.is_student) {
      return res.status(400).json({ error: '이미 학생 인증이 완료되었습니다.' });
    }
    
    // 학생 인증 처리
    await user.update({
      is_student: true,
      school_id,
      grade,
      verified_at: new Date()
    });
    
    res.json({
      message: '학생 인증 완료!',
      user: {
        user_id: user.user_id,
        nickname: user.nickname,
        is_student: user.is_student,
        school_id: user.school_id,
        grade: user.grade
      }
    });
  } catch (error) {
    console.error('학생 인증 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 4. 사용자 조회
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const user = await User.findByPk(user_id, {
      attributes: { exclude: ['password_hash'] } // 비밀번호 제외
    });
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 5. 닉네임 변경
app.patch('/api/users/:user_id/nickname', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { nickname } = req.body;
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 월 1회 제한 체크
    if (!user.canChangeNickname()) {
      return res.status(400).json({ 
        error: '닉네임은 한 달에 한 번만 변경할 수 있습니다.' 
      });
    }
    
    // 닉네임 중복 체크
    const existingNickname = await User.findByNickname(nickname);
    if (existingNickname && existingNickname.user_id !== user.user_id) {
      return res.status(400).json({ error: '이미 사용 중인 닉네임입니다.' });
    }
    
    // 닉네임 변경
    await user.update({
      nickname,
      nickname_changed_at: new Date()
    });
    
    res.json({
      message: '닉네임 변경 완료!',
      nickname: user.nickname
    });
  } catch (error) {
    console.error('닉네임 변경 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 6. 특정 학교 학생 목록 조회
app.get('/api/schools/:school_id/students', async (req, res) => {
  try {
    const { school_id } = req.params;
    
    const students = await User.findStudentsBySchool(school_id);
    
    res.json({
      count: students.length,
      students: students.map(s => ({
        user_id: s.user_id,
        nickname: s.nickname,
        grade: s.grade,
        verified_at: s.verified_at
      }))
    });
  } catch (error) {
    console.error('학생 목록 조회 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 7. Soft Delete (사용자 탈퇴)
app.delete('/api/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // Soft delete (deleted_at 설정)
    await user.destroy();
    
    res.json({ message: '사용자 탈퇴 완료' });
  } catch (error) {
    console.error('사용자 탈퇴 오류:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// ========================================
// 서버 시작
// ========================================
startServer();

module.exports = app;
