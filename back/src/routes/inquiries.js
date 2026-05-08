import express from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { cloudinary } from '../config/cloudinary.js';
import { getNowForDB } from '../utils/dateUtils.js';

const router = express.Router();

// 문의 첨부용 multer 인스턴스 (focux/inquiries 폴더로 분리)
// 비로그인 화면(Inquiry)은 첨부 안 받고, 인앱 화면(InAppInquiry)에서만 최대 3장
const inquiryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'focux/inquiries',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1080, crop: 'limit' }],
  },
});
const uploadInquiry = multer({
  storage: inquiryStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const CONTENT_MAX = 5000;
const CONTACT_USERNAME_MAX = 50;
const CONTACT_EMAIL_MAX = 255;
const APP_VERSION_MAX = 30;
const DEVICE_INFO_MAX = 255;
const MAX_IMAGES = 3;

function trimOrNull(v, max) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return max ? s.slice(0, max) : s;
}

function isValidEmail(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 3 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

async function fetchInquiryImages(inquiryId) {
  const [rows] = await pool.execute(
    `SELECT id, cloudinary_url, display_order
     FROM inquiry_images
     WHERE inquiry_id = ? AND deleted_at IS NULL
     ORDER BY display_order ASC, id ASC`,
    [inquiryId]
  );
  return rows;
}

function maskInquiryRow(row, { includeAdminFields = false } = {}) {
  if (!row) return null;
  const base = {
    id: row.id,
    user_id: row.user_id,
    contact_username: row.contact_username,
    contact_email: row.contact_email,
    content: row.content,
    app_version: row.app_version,
    device_info: row.device_info,
    status: row.status,
    answer_content: row.answer_content,
    answered_by: row.answered_by,
    answered_at: row.answered_at,
    is_read_by_user: !!row.is_read_by_user,
    read_at: row.read_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  if (includeAdminFields) {
    base.answer_note = row.answer_note;
    base.is_deleted = !!row.is_deleted;
    base.deleted_at = row.deleted_at;
  }
  return base;
}

/**
 * POST /api/inquiries
 * 문의 작성
 * - 비로그인/로그인 모두 가능 (optionalAuthenticate)
 * - 로그인 사용자만 첨부 이미지 최대 3장
 */
router.post('/', optionalAuthenticate, uploadInquiry.array('images', MAX_IMAGES), async (req, res) => {
  try {
    const userId = req.user?.userId ? Number(req.user.userId) : null;

    const content = trimOrNull(req.body?.content, CONTENT_MAX);
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '내용을 입력해주세요.',
      });
    }

    const contactUsername = trimOrNull(req.body?.contact_username, CONTACT_USERNAME_MAX);
    const contactEmail = trimOrNull(req.body?.contact_email, CONTACT_EMAIL_MAX);
    const appVersion = trimOrNull(req.body?.app_version, APP_VERSION_MAX);
    const deviceInfo = trimOrNull(req.body?.device_info, DEVICE_INFO_MAX);

    if (!contactEmail || !isValidEmail(contactEmail)) {
      return res.status(400).json({
        success: false,
        message: '답변 수신용 이메일 주소를 올바르게 입력해주세요.',
      });
    }
    if (!contactUsername) {
      return res.status(400).json({
        success: false,
        message: '본인 확인을 위해 아이디를 입력해주세요.',
      });
    }

    const connection = await pool.getConnection();
    let inquiryId;
    try {
      await connection.beginTransaction();
      const now = getNowForDB();

      const [result] = await connection.execute(
        `INSERT INTO inquiries
          (user_id, contact_username, contact_email,
           content, app_version, device_info, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
          userId,
          contactUsername,
          contactEmail,
          content,
          appVersion,
          deviceInfo,
          now,
          now,
        ]
      );
      inquiryId = result.insertId;

      // 첨부 이미지(InAppInquiry에서만 사용 — 비로그인은 보통 0장)
      if (req.files && req.files.length > 0) {
        const imageValues = req.files
          .slice(0, MAX_IMAGES)
          .map((file, index) => [inquiryId, file.path, file.filename, index]);
        await connection.query(
          'INSERT INTO inquiry_images (inquiry_id, cloudinary_url, cloudinary_public_id, display_order) VALUES ?',
          [imageValues]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json({
      success: true,
      message: '문의가 등록되었습니다.',
      data: { inquiryId },
    });
  } catch (error) {
    console.error('문의 작성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '문의 작성 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/inquiries/my
 * 내 문의 목록 (로그인 사용자)
 * 쿼리: status, page, limit
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = Number(req.user.userId);
    const { status = '', page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const conditions = ['user_id = ?', 'is_deleted = FALSE'];
    const params = [userId];
    if (status && ['pending', 'answered', 'closed'].includes(String(status).trim())) {
      conditions.push('status = ?');
      params.push(String(status).trim());
    }
    const whereSql = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT id, content, status, is_read_by_user, answered_at, created_at, updated_at
       FROM inquiries
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params
    );
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM inquiries WHERE ${whereSql}`,
      params
    );

    return res.json({
      success: true,
      data: {
        inquiries: rows,
        pagination: {
          page: parseInt(page, 10) || 1,
          limit: limitNum,
          total: Number(countRows[0]?.total ?? 0),
        },
      },
    });
  } catch (error) {
    console.error('내 문의 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '내 문의 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/inquiries/lookup?username=&email=
 * 비로그인 본인 문의 조회 (username + email 둘 다 일치할 때만 반환)
 */
router.get('/lookup', async (req, res) => {
  try {
    const username = trimOrNull(req.query?.username, CONTACT_USERNAME_MAX);
    const email = trimOrNull(req.query?.email, CONTACT_EMAIL_MAX);

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: '본인 확인을 위해 아이디와 이메일을 모두 입력해주세요.',
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, content, status, answer_content, answered_at,
              created_at, updated_at, is_read_by_user
       FROM inquiries
       WHERE is_deleted = FALSE
         AND contact_username = ?
         AND contact_email = ?
         AND user_id IS NULL
       ORDER BY created_at DESC
       LIMIT 10`,
      [username, email]
    );

    return res.json({
      success: true,
      data: { inquiries: rows },
    });
  } catch (error) {
    console.error('비로그인 문의 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '문의 조회 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/inquiries/:id
 * 문의 단건 조회
 * - 로그인 사용자: user_id = req.user.userId 일 때만
 * - 비로그인 사용자: ?username=&email= 매칭 시
 */
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const inquiryId = Number(req.params.id);
    if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
    }

    const [rows] = await pool.execute(
      `SELECT * FROM inquiries WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
      [inquiryId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: '문의를 찾을 수 없습니다.' });
    }
    const row = rows[0];

    const userId = req.user?.userId ? Number(req.user.userId) : null;
    let allowed = false;
    if (userId && row.user_id && Number(row.user_id) === userId) {
      allowed = true;
    } else if (!row.user_id) {
      const username = trimOrNull(req.query?.username, CONTACT_USERNAME_MAX);
      const email = trimOrNull(req.query?.email, CONTACT_EMAIL_MAX);
      if (
        username &&
        email &&
        row.contact_username === username &&
        row.contact_email === email
      ) {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ success: false, message: '본 문의에 대한 권한이 없습니다.' });
    }

    const images = await fetchInquiryImages(inquiryId);

    return res.json({
      success: true,
      data: {
        inquiry: maskInquiryRow(row),
        images,
      },
    });
  } catch (error) {
    console.error('문의 단건 조회 오류:', error);
    return res.status(500).json({ success: false, message: '문의 조회 중 오류가 발생했습니다.' });
  }
});

/**
 * PATCH /api/inquiries/:id/read
 * 답변 읽음 처리 (로그인 본인만)
 */
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const inquiryId = Number(req.params.id);
    const userId = Number(req.user.userId);
    if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
    }
    const [result] = await pool.execute(
      `UPDATE inquiries
       SET is_read_by_user = TRUE, read_at = ?
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [getNowForDB(), inquiryId, userId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: '문의를 찾을 수 없거나 권한이 없습니다.' });
    }
    return res.json({ success: true, message: '읽음 처리했습니다.' });
  } catch (error) {
    console.error('문의 읽음 처리 오류:', error);
    return res.status(500).json({ success: false, message: '읽음 처리 중 오류가 발생했습니다.' });
  }
});

/**
 * DELETE /api/inquiries/:id
 * 본인 문의 soft delete (로그인 본인만)
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const inquiryId = Number(req.params.id);
    const userId = Number(req.user.userId);
    if (!Number.isFinite(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({ success: false, message: '유효하지 않은 문의 ID입니다.' });
    }
    const [result] = await pool.execute(
      `UPDATE inquiries
       SET is_deleted = TRUE, deleted_at = ?
       WHERE id = ? AND user_id = ? AND is_deleted = FALSE`,
      [getNowForDB(), inquiryId, userId]
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: '문의를 찾을 수 없거나 권한이 없습니다.' });
    }
    return res.json({ success: true, message: '문의가 삭제되었습니다.' });
  } catch (error) {
    console.error('문의 삭제 오류:', error);
    return res.status(500).json({ success: false, message: '문의 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
