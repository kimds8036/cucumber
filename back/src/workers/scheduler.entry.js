import dotenv from 'dotenv';
import { createServer } from 'http';
import { initJobs } from '../jobs/index.js';
import { shouldRunCron } from '../config/serviceRole.js';

dotenv.config();

if (!shouldRunCron()) {
  console.error('[scheduler] ENABLE_CRON/SERVICE_ROLE 설정으로 Cron을 시작할 수 없습니다.');
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3001);

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', role: 'scheduler' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`[scheduler] health :${PORT}/health`);
  initJobs();
  console.log('[scheduler] Cron jobs started');
});
