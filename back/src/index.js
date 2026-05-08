import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import pool from './config/database.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import commentRoutes from './routes/comments.js';
import messageRoutes from './routes/messages.js';
import mailRoutes from './routes/mails.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import timerRoutes from './routes/timer.js';
import timetableRoutes from './routes/timetable.js';
import schoolsRoutes from './routes/schools.js';
import usersRoutes from './routes/users.js';
import searchRoutes from './routes/search.js';
import dmRoutes from './routes/dm.js';
import adminReportsRoutes from './routes/adminReports.js';
import adminInquiriesRoutes from './routes/adminInquiries.js';
import adminWebRoutes from './routes/adminWeb.js';
import inquiriesRoutes from './routes/inquiries.js';
import testRoutes from './routes/test.js';
import swaggerSpec from './swagger.js';
import { initSocketServer } from './socketServer.js';
import { initFirebase } from './config/firebase.js';
import './utils/notificationWorker.js';
import { initJobs } from './jobs/index.js';


dotenv.config();
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

// ============ 보안 설정 ============

// 1. trust proxy — ngrok / Railway 등 리버스 프록시 뒤에서 req.ip 가 정확히 잡히도록
app.set('trust proxy', 1);

// 2. Helmet — 일반적인 보안 헤더 자동 설정
//    /admin 페이지·Swagger UI 가 인라인 스크립트/스타일을 사용하므로 CSP 는 끔
//    (점진적으로 좁혀가는 방향 권장)
app.use(helmet({ contentSecurityPolicy: false }));

// 3. CORS
//    - 운영(NODE_ENV=production): CORS_ORIGIN(콤마 구분) 만 허용. 모바일 앱은 origin 이 없으므로 통과
//    - 그 외(개발): 로컬 dev 호스트만 허용
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean) : [])
  : ['http://localhost:3000', 'http://localhost:8081'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS 정책에 의해 차단되었습니다.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// 4. Body 사이즈 제한 (대용량 페이로드 / DoS 완화)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Rate Limit
//    NOTE: 현재는 단일 인스턴스 운영 가정의 in-memory store.
//          멀티 인스턴스로 확장 시 rate-limit-redis + ioredis 어댑터로 교체 필요.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.' },
});
app.use('/api/auth', authLimiter);

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});
app.use('/api', generalLimiter);

// ============ 보안 설정 끝 ============

// Swagger UI (OpenAPI 문서)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Admin web routes (로그인/가드/페이지 제공)
app.use('/admin', adminWebRoutes);

// DB 연결 테스트
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ status: 'ok', message: 'Database connected', data: rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/mails', mailRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/schools', schoolsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/admin', adminReportsRoutes);
app.use('/api/admin/inquiries', adminInquiriesRoutes);
app.use('/api/test', testRoutes);

// ============ 글로벌 에러 핸들러 ============
// 모든 라우트 등록 이후에 위치해야 한다.
// - CORS 차단은 403 으로 변환
// - 그 외 5xx 는 운영에선 메시지 마스킹, 개발에선 원본 메시지 노출
app.use((err, req, res, _next) => {
  if (err?.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'CORS 정책에 의해 차단되었습니다.' });
  }
  console.error(`[ERROR] ${req.method} ${req.path}`, err?.stack || err);
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
  return res.status(500).json({ success: false, message: err?.message || 'Internal Server Error' });
});

// HTTP 서버 + Socket.io 초기화
const httpServer = createServer(app);
initSocketServer(httpServer);

// 서버 시작 + DB 연결 상태 로그
httpServer.listen(PORT, async () => {
  console.log('==============================');
  console.log('🚀 서버가 시작되었습니다.');
  console.log(`🌐 HOST: ${HOST}`);
  console.log(`🔌 PORT: ${PORT}`);
  console.log(`🔗 BASE URL: ${BASE_URL}`);
  console.log(`📡 Health check: ${BASE_URL}/health`);
  console.log(`📚 API 문서 (Swagger): ${BASE_URL}/api-docs`);

  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    if (rows && rows.length > 0) {
      console.log('✅ DB 연결 상태: 정상 (SELECT 1 성공)');
    } else {
      console.log('⚠️ DB 연결 상태: 응답은 있었지만 결과가 비정상입니다.');
    }
  } catch (error) {
    console.log('❌ DB 연결 상태: 오류 발생');
    console.log(`   ↳ ${error.message}`);
  }

  initJobs();

  console.log('==============================');
});
// scope check test
