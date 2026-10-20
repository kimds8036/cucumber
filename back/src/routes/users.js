import express from 'express';
import { body, query } from 'express-validator';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upsertFcmToken } from '../utils/pushTokens.js';
import {
  nameLookupBindParams,
  nameLookupWhereClause,
} from '../services/userPii.service.js';

const router = express.Router();

const fcmTokenValidators = [
  body('token').isString().trim().isLength({ min: 1, max: 512 })
    .withMessage('token이 필요합니다.'),
  body('deviceId').optional({ values: 'falsy' }).isString().trim().isLength({ max: 128 }),
  body('device_id').optional({ values: 'falsy' }).isString().trim().isLength({ max: 128 }),
  body('deviceType').optional({ values: 'falsy' }).isString().trim().isLength({ max: 32 }),
  body('device_type').optional({ values: 'falsy' }).isString().trim().isLength({ max: 32 }),
  body('appVersion').optional({ values: 'falsy' }).isString().trim().isLength({ max: 32 }),
  body('app_version').optional({ values: 'falsy' }).isString().trim().isLength({ max: 32 }),
];

const userSearchValidators = [
  query('schoolId').isString().trim().isLength({ min: 1, max: 40 })
    .withMessage('schoolId가 필요합니다.'),
  query('query').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 })
    .withMessage('검색어는 100자 이내여야 합니다.'),
];

// POST /api/users/fcm-token
router.post('/fcm-token', authenticate, validate(fcmTokenValidators), async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const deviceId = String(req.body?.deviceId || req.body?.device_id || '').trim();
    const deviceType = req.body?.deviceType ?? req.body?.device_type;
    const appVersion = req.body?.appVersion ?? req.body?.app_version;
    const userId = req.user.userId;

    if (!token) {
      return res.status(400).json({ success: false, message: 'token 필요' });
    }
    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'deviceId 필요' });
    }

    await upsertFcmToken({ userId, token, deviceId, deviceType, appVersion });

    return res.json({ success: true });
  } catch (error) {
    console.error('FCM 토큰 저장 오류:', error);
    return res
      .status(500)
      .json({ success: false, message: 'FCM 토큰 저장 중 오류가 발생했습니다.' });
  }
});

// GET /api/users/me/stats
// - 마이페이지 카드용 집계(친구/게시글/스크랩 수)
router.get('/me/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [[friendRows], [postRows], [scrapRows]] = await Promise.all([
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM user_friendships
         WHERE status = 'accepted'
           AND (requester_id = ? OR addressee_id = ?)`,
        [userId, userId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM posts
         WHERE user_id = ?
           AND is_deleted = FALSE`,
        [userId]
      ),
      pool.execute(
        `SELECT COUNT(*) AS count
         FROM post_scraps
         WHERE user_id = ?`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        friendCount: Number(friendRows[0]?.count ?? 0),
        postCount: Number(postRows[0]?.count ?? 0),
        scrapCount: Number(scrapRows[0]?.count ?? 0),
      },
    });
  } catch (error) {
    console.error('내 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 통계 조회 중 오류가 발생했습니다.',
    });
  }
});

// GET /api/users/search?schoolId=xxx&query=xxx
router.get('/search', authenticate, validate(userSearchValidators), async (req, res) => {
  try {
    const schoolId = String(req.query?.schoolId || '').trim();
    const matchStr = String(req.query?.query || '').trim();

    if (!schoolId) {
      return res.status(400).json({ success: false, message: 'schoolId가 필요합니다.' });
    }

    if (!matchStr) {
      return res.json({ success: true, data: { users: [] } });
    }

    // 우편 받는 사람 검색: 실명(name) 전체 일치만 (username으로 검색하지 않음)
    const params = [schoolId, ...nameLookupBindParams(matchStr)];
    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.name_enc,
         u.username,
         u.grade,
         u.class_number,
         s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.school_id
       WHERE u.is_deleted = FALSE
         AND u.school_id = ?
         AND ${nameLookupWhereClause('u')}
       ORDER BY u.name_lookup ASC
       LIMIT 10`,
      params
    );

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      displayName: u.name,
      schoolName: u.school_name || '',
      grade: u.grade ?? null,
      class: u.class_number ?? null,
    }));

    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('유저 검색 오류:', error);
    res.status(500).json({ success: false, message: '유저 검색 중 오류가 발생했습니다.' });
  }
});

// POST /api/users/me/last-seen — 인앱(메인 게시판) 접속 갱신
router.post('/me/last-seen', authenticate, async (req, res) => {
  try {
    const { touchUserLastSeen } = await import('../services/appPresence.service.js');
    await touchUserLastSeen(req.user.userId);
    return res.json({ success: true });
  } catch (error) {
    console.error('last-seen 갱신 오류:', error);
    return res.status(500).json({
      success: false,
      message: '접속 시각 갱신 중 오류가 발생했습니다.',
    });
  }
});

// POST /api/users/me/install-convert — 가입·로그인 후 설치 퍼널 전환
router.post('/me/install-convert', authenticate, async (req, res) => {
  try {
    const { convertAppInstall } = await import('../services/appPresence.service.js');
    const installId = req.body?.installId ?? req.body?.install_id ?? null;
    const deviceId = req.body?.deviceId ?? req.body?.device_id ?? null;
    const result = await convertAppInstall({
      installId,
      deviceId,
      userId: req.user.userId,
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message || '전환에 실패했습니다.',
      });
    }
    console.error('install-convert 오류:', error);
    return res.status(500).json({
      success: false,
      message: '설치 전환 처리 중 오류가 발생했습니다.',
    });
  }
});

const PROMPT_BANNER_MS = 3 * 24 * 60 * 60 * 1000;

async function ensureUserSettings(userId) {
  await pool.execute(
    'INSERT IGNORE INTO user_settings (user_id) VALUES (?)',
    [userId],
  );
}

async function readPostWritePrompt(userId) {
  await ensureUserSettings(userId);
  const [[row]] = await pool.execute(
    `SELECT post_write_prompt_status AS status,
            post_write_prompt_skipped_at AS skippedAt,
            post_write_prompt_skip_count AS skipCount,
            post_write_prompt_done_at AS doneAt,
            post_write_prompt_banner_hidden AS bannerHidden
     FROM user_settings WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM posts WHERE user_id = ? AND is_deleted = FALSE`,
    [userId],
  );
  const postCount = Number(countRow?.cnt || 0);
  let status = row?.status || null;
  let doneAt = row?.doneAt ? new Date(row.doneAt) : null;
  if (postCount > 0 && status !== 'done') {
    await pool.execute(
      `UPDATE user_settings
       SET post_write_prompt_status = 'done',
           post_write_prompt_done_at = IFNULL(post_write_prompt_done_at, NOW())
       WHERE user_id = ? AND (post_write_prompt_status IS NULL OR post_write_prompt_status <> 'done')`,
      [userId],
    );
    status = 'done';
    doneAt = doneAt || new Date();
  }
  const skippedAt = row?.skippedAt ? new Date(row.skippedAt) : null;
  const withinBanner = skippedAt && Date.now() - skippedAt.getTime() < PROMPT_BANNER_MS;
  const bannerHidden = Number(row?.bannerHidden || 0) === 1;
  return {
    status,
    skippedAt: skippedAt ? skippedAt.toISOString() : null,
    doneAt: doneAt ? doneAt.toISOString() : null,
    skipCount: Number(row?.skipCount || 0),
    bannerHidden,
    showGuide: status === 'pending',
    showBanner: status === 'skipped' && Boolean(withinBanner) && postCount === 0 && !bannerHidden,
  };
}

router.get('/me/post-write-prompt', authenticate, async (req, res) => {
  try {
    const data = await readPostWritePrompt(req.user.userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('첫 글 안내 조회 오류:', error);
    return res.status(500).json({ success: false, message: '첫 글 안내를 불러오지 못했습니다.' });
  }
});

router.post('/me/post-write-prompt', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const action = String(req.body?.action || '');
    await ensureUserSettings(userId);
    if (action === 'pending') {
      await pool.execute(
        `UPDATE user_settings
         SET post_write_prompt_status = 'pending'
         WHERE user_id = ? AND post_write_prompt_status IS NULL`,
        [userId],
      );
    } else if (action === 'skip') {
      await pool.execute(
        `UPDATE user_settings
         SET post_write_prompt_status = 'skipped',
             post_write_prompt_skipped_at = IFNULL(post_write_prompt_skipped_at, NOW()),
             post_write_prompt_skip_count = post_write_prompt_skip_count + 1,
             post_write_prompt_skip_log = JSON_ARRAY_APPEND(
               IFNULL(post_write_prompt_skip_log, JSON_ARRAY()),
               '$',
               DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%sZ')
             )
         WHERE user_id = ? AND (post_write_prompt_status IS NULL OR post_write_prompt_status <> 'done')`,
        [userId],
      );
    } else if (action === 'done') {
      await pool.execute(
        `UPDATE user_settings
         SET post_write_prompt_status = 'done',
             post_write_prompt_done_at = IFNULL(post_write_prompt_done_at, NOW())
         WHERE user_id = ?`,
        [userId],
      );
    } else if (action === 'dismiss') {
      await pool.execute(
        `UPDATE user_settings
         SET post_write_prompt_banner_hidden = 1
         WHERE user_id = ? AND post_write_prompt_status = 'skipped'`,
        [userId],
      );
    } else {
      return res.status(400).json({ success: false, message: 'action을 확인해 주세요.' });
    }
    const data = await readPostWritePrompt(userId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error('첫 글 안내 저장 오류:', error);
    return res.status(500).json({ success: false, message: '첫 글 안내를 저장하지 못했습니다.' });
  }
});

export default router;
