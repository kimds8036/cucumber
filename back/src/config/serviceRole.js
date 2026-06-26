/**
 * Railway SERVICE_ROLE — API / Worker / Scheduler 격리 (§8 #4)
 *
 * SERVICE_ROLE: all | api | worker | scheduler
 * - all (기본): 기존 단일 프로세스와 동일
 * - api: HTTP API만, Cron·Bull worker 미기동
 * - worker: Bull notification worker만
 * - scheduler: node-cron만
 */

export function getServiceRole() {
  return (process.env.SERVICE_ROLE || 'all').trim().toLowerCase();
}

function envFlag(name, defaultWhenUnset) {
  const raw = process.env[name];
  if (raw == null || raw === '') return defaultWhenUnset;
  const v = String(raw).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** HTTP Express 서버(index.js) 기동 여부 */
export function shouldRunApiServer() {
  const role = getServiceRole();
  return role === 'all' || role === 'api';
}

/** node-cron 배치 */
export function shouldRunCron() {
  const role = getServiceRole();
  if (role === 'scheduler') return true;
  if (role === 'worker') return false;
  if (role === 'api') return envFlag('ENABLE_CRON', false);
  return envFlag('ENABLE_CRON', true);
}

/** Bull notification worker */
export function shouldRunNotificationWorker() {
  const role = getServiceRole();
  if (role === 'worker') return true;
  if (role === 'scheduler') return false;
  if (role === 'api') return false;
  return true;
}
