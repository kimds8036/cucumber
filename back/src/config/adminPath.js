/**
 * 관리자 웹 UI 경로 (유추 어려운 URL).
 * Railway Variables / back/.env 에 환경별로 다른 값 설정 권장.
 *
 * 예: ADMIN_BASE_PATH=/x-cp-7k3m9xq2w4n
 */
const PATH_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function normalizeAdminBasePath(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return '/x-cp-internal-mgmt';
  }
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const noTrail = withSlash.replace(/\/+$/, '') || '/';
  if (!PATH_PATTERN.test(noTrail)) {
    throw new Error(
      'ADMIN_BASE_PATH는 / 로 시작하고 영문·숫자·_- 만 사용해야 합니다. 예: /x-cp-7k3m9xq2w4n',
    );
  }
  if (noTrail === '/admin') {
    throw new Error(
      'ADMIN_BASE_PATH=/admin 은 사용할 수 없습니다. 유추 어려운 경로를 설정하세요.',
    );
  }
  return noTrail;
}

let cachedBasePath;

export function getAdminBasePath() {
  if (!cachedBasePath) {
    cachedBasePath = normalizeAdminBasePath(process.env.ADMIN_BASE_PATH);
  }
  return cachedBasePath;
}

/** 로그·시드 메시지용 전체 URL 경로 (호스트 제외) */
export function getAdminLoginPath() {
  return `${getAdminBasePath()}/login`;
}

/** Railway 배포 환경 (develop | production) — 관리자 UI 표시용 */
export function getDeployEnvironment() {
  const raw = String(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_TARGET ||
      (process.env.NODE_ENV === 'production' ? 'production' : 'develop'),
  )
    .trim()
    .toLowerCase();
  if (raw.includes('prod')) return 'production';
  return 'develop';
}

export function getDeployEnvironmentLabel() {
  return getDeployEnvironment() === 'production' ? 'PRODUCTION' : 'DEVELOP';
}
