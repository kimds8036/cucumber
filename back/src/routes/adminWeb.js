import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';
import { verifyToken, comparePassword, generateToken } from '../utils/auth.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminHtmlPath = path.resolve(__dirname, '../../../admin/Focux admin.html');

function parseAdminUserIds() {
  const raw = process.env.ADMIN_USER_IDS || '';
  return raw
    .split(',')
    .map((v) => Number(String(v).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function isAdminUser(userId) {
  const adminIds = parseAdminUserIds();
  if (adminIds.length === 0) return false;
  return adminIds.includes(Number(userId));
}

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
  const attrs = [
    `admin_access_token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : null,
  ].filter(Boolean);
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearAdminCookie(res) {
  res.setHeader('Set-Cookie', 'admin_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

function requireAdminWebAuth(req, res, next) {
  const token = getCookieValue(req, 'admin_access_token');
  if (!token) {
    return res.redirect('/admin/login');
  }
  const decoded = verifyToken(token);
  if (!decoded?.userId || !isAdminUser(decoded.userId)) {
    clearAdminCookie(res);
    return res.status(403).send('관리자 권한이 필요합니다.');
  }
  req.user = decoded;
  next();
}

router.get('/login', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Admin Login</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px;">
  <h2 style="margin-bottom: 12px;">Focux 관리자 로그인</h2>
  <p style="color:#666; margin-bottom: 14px;">관리자 계정으로 로그인하세요.</p>
  <form id="admin-login-form" style="max-width: 420px;">
    <input id="username" name="username" required placeholder="아이디(username)" style="width:100%;height:40px;padding:0 10px;margin-bottom:8px;" />
    <input id="password" name="password" type="password" required placeholder="비밀번호" style="width:100%;height:40px;padding:0 10px;" />
    <div style="margin-top:10px;display:flex;gap:8px;">
      <button type="submit">로그인</button>
    </div>
  </form>
  <script>
    const form = document.getElementById('admin-login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) {
          alert(data?.message || '로그인에 실패했습니다.');
          return;
        }
        window.location.href = '/admin';
      } catch (err) {
        alert('로그인 요청 중 오류가 발생했습니다.');
      }
    });
  </script>
</body></html>`);
});

router.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });
  }
  try {
    const [users] = await pool.execute(
      `SELECT id, username, password, is_deleted
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );
    if (!users.length) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const user = users[0];
    if (user.is_deleted) {
      return res.status(401).json({ success: false, message: '탈퇴한 사용자입니다.' });
    }
    const ok = await comparePassword(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (!isAdminUser(user.id)) {
      return res.status(403).json({ success: false, message: '관리자 권한이 없습니다.' });
    }
    const token = generateToken({ userId: user.id, username: user.username });
    setAdminCookie(res, token);
    return res.json({ success: true, message: '로그인 성공' });
  } catch (error) {
    console.error('관리자 로그인 오류:', error);
    return res.status(500).json({ success: false, message: '로그인 처리 중 오류가 발생했습니다.' });
  }
});

router.post('/logout', (req, res) => {
  clearAdminCookie(res);
  res.redirect('/admin/login');
});

router.get('/', requireAdminWebAuth, (req, res) => {
  res.sendFile(adminHtmlPath);
});

export default router;
