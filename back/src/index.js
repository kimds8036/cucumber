import express from 'express';
import cors from 'cors';
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
import adminWebRoutes from './routes/adminWeb.js';
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.use('/api/admin', adminReportsRoutes);

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
