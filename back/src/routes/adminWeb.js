import express from 'express';
import pool from '../config/database.js';
import { getAdminBasePath } from '../config/adminPath.js';
import {
  comparePassword,
  generateAdminOtpSetupToken,
  generateAdminSessionToken,
  getTokenExpiresAtMs,
  verifyToken,
} from '../utils/auth.js';
import { authenticate } from '../middleware/auth.js';
import {
  buildTotpQrDataUrl,
  confirmAdminTotpSecret,
  createPendingTotpSecret,
  generateTotpSecret,
  getAdminTotpRow,
  getConfirmedTotpSecret,
  getPendingTotpSecret,
  verifyTotpCode,
} from '../services/adminTotp.service.js';
import {
  getAdminStaticDir,
  renderAdminIndexHtml,
  renderAdminLoginHtml,
} from '../admin/renderAdminPage.js';

const router = express.Router();

function getCookieValue(req, key) {
  const raw = req.headers.cookie || '';
  if (!raw) return null;
  const parts = raw.split(';').map((v) => v.trim());
  const row = parts.find((v) => v.startsWith(`${key}=`));
  if (!row) return null;
  const value = row.slice(key.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function setAdminCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production';
  const cookiePath = getAdminBasePath();
  const attrs = [
    `admin_access_token=${encodeURIComponent(token)}`,
    `Path=${cookiePath}`,
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : null,
  ].filter(Boolean);
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearAdminCookie(res) {
  const cookiePath = getAdminBasePath();
  res.setHeader(
    'Set-Cookie',
    `admin_access_token=; Path=${cookiePath}; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function issueAdminLoginSuccess(res, { adminId, username }) {
  const token = generateAdminSessionToken({ adminId, username });
  setAdminCookie(res, token);
  return res.json({
    success: true,
    message: '로그인 성공',
    token,
    expiresAt: getTokenExpiresAtMs(token),
  });
}

async function validateAdminCredentials(username, password) {
  const [admins] = await pool.execute(
    `SELECT id, username, password, is_deleted
     FROM admin_users
     WHERE username = ?
     LIMIT 1`,
    [username],
  );
  if (!admins.length) {
    return { error: { status: 401, message: '아이디 또는 비밀번호가 올바르지 않습니다.' } };
  }
  const admin = admins[0];
  if (admin.is_deleted) {
    return { error: { status: 401, message: '비활성화된 관리자 계정입니다.' } };
  }
  const ok = await comparePassword(password, admin.password);
  if (!ok) {
    return { error: { status: 401, message: '아이디 또는 비밀번호가 올바르지 않습니다.' } };
  }
  return { admin };
}

router.use('/assets', express.static(getAdminStaticDir()));

router.get('/login', (_req, res) => {
  res.type('html').send(renderAdminLoginHtml());
});

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const otpCode = String(req.body?.otpCode || '').trim();
  const setupOtpCode = String(req.body?.setupOtpCode || '').trim();
  const setupToken = String(req.body?.setupToken || '').trim();

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '아이디와 비밀번호를 입력해주세요.',
    });
  }

  try {
    const cred = await validateAdminCredentials(username, password);
    if (cred.error) {
      return res.status(cred.error.status).json({
        success: false,
        message: cred.error.message,
      });
    }
    const admin = cred.admin;

    if (setupToken && setupOtpCode) {
      let decoded;
      try {
        decoded = verifyToken(setupToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: 'OTP 등록 세션이 만료되었습니다. 다시 로그인해 주세요.',
        });
      }
      const setupAdminId = Number(decoded.adminId ?? decoded.userId);
      if (
        decoded?.type !== 'admin_otp_setup' ||
        setupAdminId !== Number(admin.id)
      ) {
        return res.status(401).json({
          success: false,
          message: '유효하지 않은 OTP 등록 세션입니다.',
        });
      }

      const pendingSecret = await getPendingTotpSecret(admin.id);
      if (!pendingSecret || !(await verifyTotpCode(setupOtpCode, pendingSecret))) {
        return res.status(400).json({
          success: false,
          message: 'OTP 코드가 올바르지 않습니다.',
        });
      }

      await confirmAdminTotpSecret(admin.id, pendingSecret);
      return issueAdminLoginSuccess(res, {
        adminId: admin.id,
        username: admin.username,
      });
    }

    const totpRow = await getAdminTotpRow(admin.id);
    const hasConfirmedOtp = Boolean(totpRow?.confirmed_at);

    if (!hasConfirmedOtp) {
      let pendingSecret = await getPendingTotpSecret(admin.id);
      if (!pendingSecret) {
        pendingSecret = generateTotpSecret();
        await createPendingTotpSecret(admin.id, pendingSecret);
      }
      const qrDataUrl = await buildTotpQrDataUrl({
        secret: pendingSecret,
        username: admin.username,
      });
      const newSetupToken = generateAdminOtpSetupToken({
        adminId: admin.id,
        username: admin.username,
      });
      return res.json({
        success: false,
        phase: 'setup',
        message: 'Google OTP 앱에 QR을 등록한 뒤 6자리를 입력해 주세요.',
        qrDataUrl,
        setupToken: newSetupToken,
      });
    }

    if (!otpCode) {
      return res.json({
        success: false,
        phase: 'otp_required',
        message: 'Google OTP 6자리를 입력해 주세요.',
      });
    }

    const secret = await getConfirmedTotpSecret(admin.id);
    if (!secret || !(await verifyTotpCode(otpCode, secret))) {
      return res.status(401).json({
        success: false,
        message: 'OTP 코드가 올바르지 않습니다.',
      });
    }

    return issueAdminLoginSuccess(res, {
      adminId: admin.id,
      username: admin.username,
    });
  } catch (error) {
    if (error?.code === 'OTP_ENCRYPTION_KEY_NOT_CONFIGURED') {
      return res.status(503).json({
        success: false,
        message:
          'OTP 암호화 키(OTP_ENCRYPTION_KEY)가 설정되지 않았습니다. Railway Variables를 확인하세요.',
      });
    }
    console.error('관리자 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.',
    });
  }
});

router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.redirect(`${getAdminBasePath()}/login`);
});

router.post('/session/extend', authenticate, (req, res) => {
  if (req.user?.type !== 'admin_session') {
    return res.status(403).json({ success: false, message: '관리자 권한이 없습니다.' });
  }
  if (req.user?.adminMfa !== true) {
    return res.status(403).json({
      success: false,
      message: '관리자 2차 인증(OTP)이 필요합니다.',
      code: 'ADMIN_MFA_REQUIRED',
    });
  }

  const token = generateAdminSessionToken({
    adminId: req.user.adminId ?? req.user.userId,
    username: req.user.username,
  });
  setAdminCookie(res, token);
  return res.json({
    success: true,
    message: '세션이 연장되었습니다.',
    token,
    expiresAt: getTokenExpiresAtMs(token),
  });
});

router.get('/', (_req, res) => {
  res.type('html').send(renderAdminIndexHtml());
});

export default router;
