import dotenv from 'dotenv';

dotenv.config();

process.env.SERVICE_ROLE = process.env.SERVICE_ROLE || 'worker';

console.log('[worker] notification worker starting…');

await import('../utils/notificationWorker.js');

console.log('[worker] Bull notification worker running');
