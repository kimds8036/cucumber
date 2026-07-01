import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  createRedisRateLimitStore,
  logRateLimitStoreMode,
} from './middleware/rateLimitStore.js';
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
import adminSignupCertificatesRoutes from './routes/adminSignupCertificates.js';
import adminSignupStudentIdsRoutes from './routes/adminSignupStudentIds.js';
import adminAttendanceRoutes from './routes/adminAttendance.js';
import adminSystemRoutes from './routes/adminSystem.js';
import adminAccountsRoutes from './routes/adminAccounts.js';
import adminWebRoutes from './routes/adminWeb.js';
import { getAdminBasePath } from './config/adminPath.js';
import inquiriesRoutes from './routes/inquiries.js';
import appRoutes from './routes/app.js';
import testRoutes from './routes/test.js';
import attendanceRoutes from './routes/attendance.js';
import swaggerSpec from './swagger.js';
import { initSocketServer } from './socketServer.js';
import { initFirebase } from './config/firebase.js';
import { initJobs } from './jobs/index.js';
import {
  shouldRunApiServer,
  shouldRunCron,
  shouldRunNotificationWorker,
  getServiceRole,
} from './config/serviceRole.js';
import { getBatchRedis, isRedisConfigured } from './services/batchRedis.service.js';
import { ensurePersonalMailSchema } from './db/ensurePersonalMailSchema.js';
import { isProductionEnv, sendErrorResponse } from './utils/httpError.js';
import { requireMinAppVersion } from './middleware/requireMinAppVersion.js';
import {
  attachSystemFlags,
  blockGlobalReadonlyWrites,
  blockLockedSchoolWrite,
} from './middleware/systemFlags.js';


dotenv.config();
initFirebase();

if (shouldRunNotificationWorker()) {
  await import('./utils/notificationWorker.js');
}

if (!shouldRunApiServer()) {
  console.error(
    `[bootstrap] SERVICE_ROLE=${getServiceRole()} — HTTP API 서버를 시작하지 않습니다. worker/scheduler 엔트리를 사용하세요.`,
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const BASE_URL = `http://${HOST}:${PORT}`;

const notFoundJson = { success: false, message: 'Not found' };

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
const defaultAdminOrigins = [
  'https://cucumber-production.up.railway.app',
  'https://cucumber-develop.up.railway.app',
];
const corsFromEnv = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const allowedOrigins = isProductionEnv()
  ? [...new Set([...corsFromEnv, ...defaultAdminOrigins])]
  : ['http://localhost:3000', 'http://localhost:8081', ...defaultAdminOrigins];

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
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true, limit: '8mb' }));

// 5. Rate Limit — Redis 설정 시 rate-limit-redis + 기존 ioredis 공유, 없으면 in-memory
logRateLimitStoreMode();
const authRateLimitStore = createRedisRateLimitStore('auth');
const apiRateLimitStore = createRedisRateLimitStore('api');
const adminLoginRateLimitStore = createRedisRateLimitStore('admin-login');

// /api/auth: 로그인·가입 등 POST만 엄격히 제한하고, GET(/me 등)은 앱 초기화·탭 전환에서
// 짧은 시간에 여러 번 호출되므로 제외해 429(15분 락)로 전체 기능이 막히는 것을 방지합니다.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  ...(authRateLimitStore ? { store: authRateLimitStore } : {}),
  message: { success: false, message: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.' },
});
app.use('/api/auth', authLimiter);

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API_PER_MIN || 300),
  standardHeaders: true,
  legacyHeaders: false,
  ...(apiRateLimitStore ? { store: apiRateLimitStore } : {}),
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

const strictApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_STRICT_API_PER_MIN || 60),
  standardHeaders: true,
  legacyHeaders: false,
  ...(apiRateLimitStore ? { store: apiRateLimitStore } : {}),
  message: { success: false, message: '비상 제한 모드입니다. 잠시 후 다시 시도해주세요.' },
});

async function apiRateLimitGate(req, res, next) {
  try {
    const { getSystemFlags } = await import('./services/systemFlags.service.js');
    const flags = await getSystemFlags();
    if (flags.rate_limit_strict_mode) {
      return strictApiLimiter(req, res, next);
    }
  } catch {
    // fall through
  }
  return generalLimiter(req, res, next);
}
app.use('/api', apiRateLimitGate);

// 시스템 플래그 (비상 스위치)
app.use('/api', attachSystemFlags);
app.use('/api', blockGlobalReadonlyWrites);
app.use('/api', blockLockedSchoolWrite);

const adminBasePath = getAdminBasePath();

// 관리자 로그인 무차별 대입 방지 (POST …/login 전용, /api limiter 밖)
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  ...(adminLoginRateLimitStore ? { store: adminLoginRateLimitStore } : {}),
  message: {
    success: false,
    message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
  },
});
app.use(adminBasePath, (req, res, next) => {
  if (req.method === 'POST' && req.path === '/login') {
    return adminLoginLimiter(req, res, next);
  }
  next();
});

// ============ 보안 설정 끝 ============

// Swagger UI — 운영 환경에서는 404 (API 정찰 방지)
if (isProductionEnv()) {
  app.use('/api-docs', (_req, res) => res.status(404).json(notFoundJson));
} else {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Health check
app.get('/health', async (req, res) => {
  const payload = {
    status: 'ok',
    message: 'Server is running',
    serviceRole: getServiceRole(),
  };
  if (isRedisConfigured()) {
    try {
      const redis = await getBatchRedis();
      const pong = await redis.ping();
      payload.redis = pong === 'PONG' ? 'ok' : 'degraded';
    } catch {
      payload.redis = 'error';
      payload.status = 'degraded';
    }
  }
  try {
    await pool.execute('SELECT 1');
    payload.mysql = 'ok';
  } catch {
    payload.mysql = 'error';
    payload.status = 'degraded';
  }
  res.status(payload.status === 'ok' ? 200 : 503).json(payload);
});

// App-Version 미들웨어 (docs/워크플로.md)
app.use(requireMinAppVersion);

// Admin web routes (로그인/가드/페이지 제공) — ADMIN_BASE_PATH
app.use(adminBasePath, adminWebRoutes);

// DB 연결 테스트 — 운영 환경에서는 404
if (isProductionEnv()) {
  app.get('/api/test-db', (_req, res) => res.status(404).json(notFoundJson));
} else {
  app.get('/api/test-db', async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT 1 as test');
      res.json({ status: 'ok', message: 'Database connected', data: rows });
    } catch (error) {
      sendErrorResponse(res, 500, error, { logLabel: '[test-db]' });
    }
  });
}

// Routes
app.use('/api/app', appRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
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
app.use('/api/admin/signup-certificates', adminSignupCertificatesRoutes);
app.use('/api/admin/signup-student-ids', adminSignupStudentIdsRoutes);
app.use('/api/admin/attendance', adminAttendanceRoutes);
app.use('/api/admin/system', adminSystemRoutes);
app.use('/api/admin/accounts', adminAccountsRoutes);
app.use('/api/test', testRoutes);

// ============ 글로벌 에러 핸들러 ============
// 모든 라우트 등록 이후에 위치해야 한다.
// - CORS 차단은 403 으로 변환
// - 운영: DB/SQL/스택 등 내부 정보는 응답에 포함하지 않음 (console.error 만 유지)
app.use((err, req, res, _next) => {
  if (err?.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: 'CORS 정책에 의해 차단되었습니다.' });
  }
  console.error(`[ERROR] ${req.method} ${req.path}`, err?.stack || err);
  const message = isProductionEnv()
    ? 'Internal Server Error'
    : err?.message || 'Internal Server Error';
  return res.status(500).json({ success: false, message });
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
  if (!isProductionEnv()) {
    console.log(`📚 API 문서 (Swagger): ${BASE_URL}/api-docs`);
  }

  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    if (rows && rows.length > 0) {
      console.log('✅ DB 연결 상태: 정상 (SELECT 1 성공)');
    } else {
      console.log('⚠️ DB 연결 상태: 응답은 있었지만 결과가 비정상입니다.');
    }
    await ensurePersonalMailSchema();
    console.log('✅ personal_mails 스키마 확인 완료');
  } catch (error) {
    console.log('❌ DB 연결 상태: 오류 발생');
    console.log(`   ↳ ${error.message}`);
  }

  initJobs();

  console.log(
    `[bootstrap] SERVICE_ROLE=${getServiceRole()} cron=${shouldRunCron()} worker=${shouldRunNotificationWorker()}`,
  );
  console.log('==============================');
  console.log(`🔐 Admin UI: ${adminBasePath}/login (ADMIN_BASE_PATH)`);
  console.log('==============================');
});
