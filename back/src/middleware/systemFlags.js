import { getSystemFlags, getBlockedMessage } from '../services/systemFlags.service.js';

export async function attachSystemFlags(req, res, next) {
  try {
    req.systemFlags = await getSystemFlags();
    return next();
  } catch {
    req.systemFlags = {};
    return next();
  }
}

function reject(res, flags, fallbackMessage) {
  return res.status(503).json({
    success: false,
    message: getBlockedMessage(flags),
    code: 'SYSTEM_MAINTENANCE',
    detail: fallbackMessage,
  });
}

export function blockWhenFlag(flagKey, fallbackMessage) {
  return async (req, res, next) => {
    if (isAdminApiRequest(req)) return next();
    const flags = req.systemFlags || (await getSystemFlags());
    if (flags.global_readonly && flagKey !== 'global_readonly') {
      return reject(res, flags, '서비스가 읽기 전용 모드입니다.');
    }
    if (flags[flagKey]) {
      return reject(res, flags, fallbackMessage);
    }
    return next();
  };
}

function isAdminApiRequest(req) {
  const p = String(req.path || req.url || '');
  return p.startsWith('/admin');
}

export async function blockGlobalReadonlyWrites(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  if (isAdminApiRequest(req)) return next();
  const flags = req.systemFlags || (await getSystemFlags());
  if (flags.global_readonly) {
    return reject(res, flags, '서비스가 읽기 전용 모드입니다.');
  }
  return next();
}

export async function blockLockedSchoolWrite(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  const schoolId = Number(req.user?.schoolId ?? req.user?.school_id);
  if (!Number.isFinite(schoolId) || schoolId <= 0) return next();
  const flags = req.systemFlags || (await getSystemFlags());
  const locked = flags.locked_school_ids || [];
  if (locked.includes(schoolId)) {
    return reject(res, flags, '해당 학교는 일시적으로 쓰기가 제한되어 있습니다.');
  }
  return next();
}
