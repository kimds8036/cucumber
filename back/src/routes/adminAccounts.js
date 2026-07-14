import express from 'express';
import pool from '../config/database.js';
import { requireAdminApi } from '../middleware/adminAuth.js';
import { requireAdminRole } from '../middleware/adminRoles.js';
import { ADMIN_ROLES, isValidAdminRole } from '../constants/adminRoles.js';
import { hashPassword } from '../utils/auth.js';
import { writeAuditLog } from '../services/adminAudit.service.js';

const router = express.Router();

router.get('/me', requireAdminApi, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, name, role, last_login_at FROM admin_users WHERE id = ? LIMIT 1`,
      [req.user.userId],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: '관리자를 찾을 수 없습니다.' });
    }
    const a = rows[0];
    return res.json({
      success: true,
      data: {
        id: a.id,
        username: a.username,
        name: a.name,
        role: a.role,
        lastLoginAt: a.last_login_at,
      },
    });
  } catch (error) {
    console.error('admin me 오류:', error);
    return res.status(500).json({ success: false, message: '관리자 정보 조회 실패' });
  }
});

router.get(
  '/accounts',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.SUPER),
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, username, name, role, is_deleted, last_login_at, created_at
         FROM admin_users
         ORDER BY id ASC`,
      );
      return res.json({ success: true, data: { accounts: rows } });
    } catch (error) {
      console.error('admin accounts 조회 오류:', error);
      return res.status(500).json({ success: false, message: '관리자 계정 조회 실패' });
    }
  },
);

router.post(
  '/accounts',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.SUPER),
  async (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim() || username;
    const role = String(req.body?.role || ADMIN_ROLES.MODERATOR).toLowerCase();

    if (!username || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: '아이디와 8자 이상 비밀번호가 필요합니다.',
      });
    }
    if (!isValidAdminRole(role)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 역할입니다.' });
    }

    try {
      const hashed = await hashPassword(password);
      const [result] = await pool.execute(
        `INSERT INTO admin_users (username, password, name, role) VALUES (?, ?, ?, ?)`,
        [username, hashed, name, role],
      );
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'admin_account_create',
        targetType: 'admin_user',
        targetId: result.insertId,
        note: `role=${role}`,
      });
      return res.json({
        success: true,
        data: { id: result.insertId, username, name, role },
        message: '관리자 계정이 생성되었습니다. OTP 등록이 필요합니다.',
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
      }
      console.error('admin account 생성 오류:', error);
      return res.status(500).json({ success: false, message: '관리자 계정 생성 실패' });
    }
  },
);

router.patch(
  '/accounts/:id',
  requireAdminApi,
  requireAdminRole(ADMIN_ROLES.SUPER),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 ID' });
    }
    if (id === req.user.userId && req.body?.is_deleted === true) {
      return res.status(400).json({ success: false, message: '본인 계정은 비활성화할 수 없습니다.' });
    }

    const fields = [];
    const params = [];
    if (req.body?.name != null) {
      fields.push('name = ?');
      params.push(String(req.body.name).trim());
    }
    if (req.body?.role != null) {
      const role = String(req.body.role).toLowerCase();
      if (!isValidAdminRole(role)) {
        return res.status(400).json({ success: false, message: '유효하지 않은 역할' });
      }
      fields.push('role = ?');
      params.push(role);
    }
    if (req.body?.is_deleted != null) {
      fields.push('is_deleted = ?');
      params.push(req.body.is_deleted === true);
    }
    if (req.body?.password) {
      const hashed = await hashPassword(String(req.body.password));
      fields.push('password = ?');
      params.push(hashed);
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: '변경할 항목이 없습니다.' });
    }
    params.push(id);

    try {
      const [result] = await pool.execute(
        `UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`,
        params,
      );
      if (!result.affectedRows) {
        return res.status(404).json({ success: false, message: '계정을 찾을 수 없습니다.' });
      }
      await writeAuditLog({
        adminUserId: req.user.userId,
        actionType: 'admin_account_update',
        targetType: 'admin_user',
        targetId: id,
        extra: {
          name: req.body?.name,
          role: req.body?.role,
          is_deleted: req.body?.is_deleted,
          passwordChanged: Boolean(req.body?.password),
        },
      });
      return res.json({ success: true, message: '관리자 계정이 수정되었습니다.' });
    } catch (error) {
      console.error('admin account 수정 오류:', error);
      return res.status(500).json({ success: false, message: '관리자 계정 수정 실패' });
    }
  },
);

export default router;
