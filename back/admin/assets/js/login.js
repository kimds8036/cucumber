const ADMIN_BASE = window.__ADMIN_BASE__ || '';

function adminUrl(subpath) {
  const p = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `${ADMIN_BASE}${p}`;
}

const HOSTS = {
  production: 'https://cucumber-production.up.railway.app',
  develop: 'https://cucumber-develop.up.railway.app',
};

const envSelect = document.getElementById('env');
const form = document.getElementById('admin-login-form');
const otpLoginBlock = document.getElementById('otp-login-block');
const otpSetupBlock = document.getElementById('otp-setup-block');
const qrWrap = document.getElementById('qr-wrap');
const errorMsg = document.getElementById('error-msg');
let setupToken = null;
let phase = 'password';

function getEnv() {
  return envSelect.value || 'production';
}

function getHost() {
  return HOSTS[getEnv()] || HOSTS.production;
}

function tokenKey() {
  return `adminToken_${getEnv()}`;
}

function sessionExpiresKey() {
  return `adminSessionExpiresAt_${getEnv()}`;
}

const savedEnv = localStorage.getItem('adminEnv');
if (savedEnv && HOSTS[savedEnv]) envSelect.value = savedEnv;

function redirectIfLoggedIn() {
  if (sessionStorage.getItem(tokenKey())) {
    window.location.replace(adminUrl('/'));
  }
}
redirectIfLoggedIn();
window.addEventListener('pageshow', (e) => {
  if (e.persisted) redirectIfLoggedIn();
});

envSelect.addEventListener('change', () => {
  localStorage.setItem('adminEnv', getEnv());
  resetPhase();
});

function resetPhase() {
  phase = 'password';
  setupToken = null;
  otpLoginBlock.style.display = 'none';
  otpSetupBlock.style.display = 'none';
  qrWrap.style.display = 'none';
  errorMsg.textContent = '';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const otpCode = document.getElementById('otpCode').value.trim();
  const setupOtpCode = document.getElementById('setupOtpCode').value.trim();

  const body = { username, password };
  if (phase === 'otp') body.otpCode = otpCode;
  if (phase === 'setup') {
    body.setupToken = setupToken;
    body.setupOtpCode = setupOtpCode;
  }

  document.getElementById('submit-btn').disabled = true;
  try {
    const res = await fetch(`${getHost()}${adminUrl('/login')}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (data?.success && data?.token) {
      sessionStorage.setItem(tokenKey(), data.token);
      if (data.expiresAt) {
        sessionStorage.setItem(sessionExpiresKey(), String(data.expiresAt));
      }
      localStorage.setItem('adminEnv', getEnv());
      window.location.href = adminUrl('/');
      return;
    }

    if (data?.phase === 'otp_required') {
      phase = 'otp';
      otpLoginBlock.style.display = 'block';
      otpSetupBlock.style.display = 'none';
      errorMsg.textContent = data.message || 'OTP 6자리를 입력해 주세요.';
      return;
    }

    if (data?.phase === 'setup' && data?.qrDataUrl) {
      phase = 'setup';
      setupToken = data.setupToken;
      otpSetupBlock.style.display = 'block';
      otpLoginBlock.style.display = 'none';
      qrWrap.style.display = 'block';
      document.getElementById('qr-image').src = data.qrDataUrl;
      errorMsg.textContent = data.message || 'QR 등록 후 OTP를 입력하세요.';
      return;
    }

    errorMsg.textContent = data?.message || '로그인에 실패했습니다.';
  } catch {
    errorMsg.textContent = '로그인 요청 중 오류가 발생했습니다. CORS·네트워크를 확인하세요.';
  } finally {
    document.getElementById('submit-btn').disabled = false;
  }
});
