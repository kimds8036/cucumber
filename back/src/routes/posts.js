import express from 'express';
import { body, param } from 'express-validator';
import pool from '../config/database.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createNotification } from '../utils/notifications.js';
import {
  getKstThreeDaysThroughToday235959UtcForSql,
  getKstTodayRangeUtcForSql,
  getKstYesterday0000ThroughToday235959UtcForSql,
  getNowForDB,
} from '../utils/dateUtils.js';
import { cloudinary, uploadPost } from '../config/cloudinary.js';
import { haversineKm, sqlHaversineKmLessOrEqual } from '../utils/geo.js';
import { appendUserBlockFilter } from '../utils/userBlockFilter.js';
import { blockWhenFlag } from '../middleware/systemFlags.js';
import { isBlockedBy } from '../utils/userBlock.js';
import { submitContentReport } from '../services/reportSubmission.service.js';
import { notifyAppealCreated } from '../services/discordWebhook.service.js';
const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// 검증 체이너 — 핸들러 안의 비즈니스 가드(작성자 본인 학교 확인 등) 는 그대로 둔다.
// ─────────────────────────────────────────────────────────────────────────────
const POST_CONTENT_MAX = 5000;
// 현재 운영 중인 게시판 유형. 새 유형 추가 시 여기에 등록한다.
const VALID_BOARD_TYPES = ['school', 'national'];

const postCreateValidators = [
  body('boardType').isString().withMessage('게시판 유형을 선택해주세요.')
    .bail().trim().isIn(VALID_BOARD_TYPES).withMessage('유효하지 않은 게시판 유형입니다.'),
  body('content').isString().withMessage('내용을 입력해주세요.')
    .bail().trim().isLength({ min: 1, max: POST_CONTENT_MAX })
    .withMessage(`내용은 1-${POST_CONTENT_MAX}자 이내여야 합니다.`),
  body('schoolId').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
  body('latitude').optional({ values: 'falsy' }).isFloat({ min: -90, max: 90 })
    .withMessage('위도가 올바르지 않습니다.'),
  body('longitude').optional({ values: 'falsy' }).isFloat({ min: -180, max: 180 })
    .withMessage('경도가 올바르지 않습니다.'),
];

const postIdParamValidator = [
  param('id').toInt().isInt({ min: 1 }).withMessage('게시글 ID 가 올바르지 않습니다.'),
];

const postReportValidators = [
  ...postIdParamValidator,
  body('reason').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  body('detail').optional({ values: 'falsy' }).isString().trim().isLength({ max: 1000 }),
];

/** message_images 조회(messages.js)와 동일 패턴 — JSON_ARRAYAGG / mysql2 반환 타입을 string[] 로 통일 */
function normalizePostImagesFromRow(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((u) => typeof u === 'string');
  }
  if (typeof raw === 'string') {
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
          ? parsed.filter((u) => typeof u === 'string')
          : [];
      } catch {
        return [];
      }
    }
    return [raw];
  }
  return [];
}

/** 좋아요/댓글/스크랩 **발생 시각**이 [start, end] 안에 드는 행을 게시물별로 집계 (전국) */
const SQL_ENGAGED_EVENTS_NATIONAL = `
(SELECT pl.post_id AS post_id FROM post_likes pl
  INNER JOIN posts p ON p.id = pl.post_id AND p.board_type = 'national' AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE pl.created_at >= ? AND pl.created_at <= ?)
UNION ALL
(SELECT c.post_id FROM comments c
  INNER JOIN posts p ON p.id = c.post_id AND p.board_type = 'national' AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE (c.is_deleted = FALSE OR c.is_deleted IS NULL)
    AND c.created_at >= ? AND c.created_at <= ?)
UNION ALL
(SELECT ps.post_id FROM post_scraps ps
  INNER JOIN posts p ON p.id = ps.post_id AND p.board_type = 'national' AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE ps.created_at >= ? AND ps.created_at <= ?)`;

/** 학교 게시물 한정, 동일 집계 */
const SQL_ENGAGED_EVENTS_SCHOOL = `
(SELECT pl.post_id AS post_id FROM post_likes pl
  INNER JOIN posts p ON p.id = pl.post_id
    AND p.board_type = 'school' AND p.school_id = ? AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE pl.created_at >= ? AND pl.created_at <= ?)
UNION ALL
(SELECT c.post_id FROM comments c
  INNER JOIN posts p ON p.id = c.post_id
    AND p.board_type = 'school' AND p.school_id = ? AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE (c.is_deleted = FALSE OR c.is_deleted IS NULL)
    AND c.created_at >= ? AND c.created_at <= ?)
UNION ALL
(SELECT ps.post_id FROM post_scraps ps
  INNER JOIN posts p ON p.id = ps.post_id
    AND p.board_type = 'school' AND p.school_id = ? AND p.is_deleted = FALSE AND p.is_hidden = FALSE
  WHERE ps.created_at >= ? AND ps.created_at <= ?)`;

function engagementWindowParams6(start, end) {
  return [start, end, start, end, start, end];
}

function schoolEngagementParams(schoolId, start, end) {
  return [
    schoolId,
    start,
    end,
    schoolId,
    start,
    end,
    schoolId,
    start,
    end,
  ];
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {number[]} postIds
 * @param {string} whereAndSql conditions.join (without "WHERE")
 * @param {unknown[]} whereParams params for whereAndSql
 */
async function loadPostsRowsByIdOrder(
  pool,
  postIds,
  likeScrapUserId,
  whereAndSql,
  whereParams
) {
  if (postIds.length === 0) return [];
  const placeholders = postIds.map(() => '?').join(', ');
  const orderByField = postIds.map(() => '?').join(', ');
  const popularParams = [
    likeScrapUserId,
    likeScrapUserId,
    ...postIds,
    ...whereParams,
    ...postIds,
  ];
  const [rows] = await pool.execute(
    `SELECT
      p.id,
      p.user_id,
      p.board_type,
      p.school_id,
      p.content,
      p.latitude,
      p.longitude,
      p.like_count,
      p.comment_count,
      p.created_at,
      u.name_enc as author_name_enc,
      u.color_id,
      s.name as school_name,
      (SELECT pi1.cloudinary_url
         FROM post_images pi1
        WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
        ORDER BY pi1.display_order ASC
        LIMIT 1) AS thumbnail,
      (SELECT COUNT(*) FROM post_likes pl
        WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
      (SELECT COUNT(*) FROM post_scraps ps
        WHERE ps.post_id = p.id AND ps.user_id = ?) AS is_scrapped,
      (SELECT COUNT(*) FROM post_scraps ps_cnt
        WHERE ps_cnt.post_id = p.id) AS scrap_count,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name))
         FROM post_tags pt
         INNER JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id = p.id) AS tags
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN schools s ON p.school_id = s.school_id
    WHERE p.id IN (${placeholders}) AND p.is_deleted = FALSE AND p.is_hidden = FALSE
      AND (${whereAndSql})
    ORDER BY FIELD(p.id, ${orderByField})`,
    popularParams
  );
  return rows;
}

// 해시태그 자동완성용 검색 API
// GET /api/posts/tags/search?query=중간
router.get('/tags/search', async (req, res) => {
  try {
    const { query = '' } = req.query;
    let q = String(query || '').trim();
    if (!q) {
      return res.json({
        success: true,
        data: { tags: [] },
      });
    }
    if (!q.startsWith('#')) {
      q = `#${q}`;
    }
    const like = `${q}%`;

    const [rows] = await pool.execute(
      'SELECT id, name FROM tags WHERE name LIKE ? ORDER BY name LIMIT 20',
      [like],
    );

    res.json({
      success: true,
      data: { tags: rows },
    });
  } catch (error) {
    console.error('태그 검색 오류:', error);
    res.status(500).json({
      success: false,
      message: '태그 검색 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 목록 조회 (검색 포함) - 선택적 인증으로 본인 글 여부 반환
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    const userId = req.user?.userId ?? null;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
      viewerLat,
      viewerLng,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, offset);
    const conditions = [];
    const params = [];

    const vLat = viewerLat != null && viewerLat !== '' ? parseFloat(viewerLat) : NaN;
    const vLng = viewerLng != null && viewerLng !== '' ? parseFloat(viewerLng) : NaN;
    const hasViewerCoords =
      !Number.isNaN(vLat) &&
      !Number.isNaN(vLng) &&
      vLat >= -90 &&
      vLat <= 90 &&
      vLng >= -180 &&
      vLng <= 180;

    if (sort === 'nearby') {
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '근처 탭은 로그인 후 이용할 수 있습니다.',
        });
      }
      if (!hasViewerCoords) {
        return res.status(400).json({
          success: false,
          message: '근처 탭을 사용하려면 위치 좌표가 필요합니다.',
        });
      }
      const [settingsRows] = await pool.execute(
        'SELECT board_distance_km FROM user_settings WHERE user_id = ?',
        [userId],
      );
      let maxKm = 10;
      if (settingsRows.length > 0) {
        const raw = settingsRows[0].board_distance_km;
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) maxKm = Math.min(100, Math.max(1, n));
      }
      conditions.push('p.latitude IS NOT NULL', 'p.longitude IS NOT NULL');
      conditions.push(sqlHaversineKmLessOrEqual('p'));
      params.push(vLat, vLat, vLng, maxKm);
    }

    // 게시판 타입 필터
    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    // 학교 게시판 필터
    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    // 검색어 필터
    if (search) {
      conditions.push('p.content LIKE ?');
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
    }

    appendUserBlockFilter(conditions, params, userId, 'p.user_id');

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE AND p.is_hidden = FALSE`
        : 'WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE';

    const likeScrapUserId = userId ?? 0;

    // 정렬
    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy = 'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'nearby') {
      orderBy = 'p.created_at DESC';
    }

    // 게시글 조회 (삭제되지 않은 것만) — 로그인 시 내 좋아요/스크랩 여부
    const listParams = [likeScrapUserId, likeScrapUserId, ...params];

    let posts = [];
    let total = 0;
    let usedEngagementPopular = false;

    {
      const whereAnd = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
      if (
        sort === 'popular' &&
        !search &&
        boardType === 'school' &&
        schoolId
      ) {
        usedEngagementPopular = true;
        const { start, end } = getKstYesterday0000ThroughToday235959UtcForSql();
        const sParams = schoolEngagementParams(schoolId, start, end);
        const [countRow] = await pool.execute(
          `SELECT COUNT(*) AS c FROM (
            SELECT u.post_id FROM (${SQL_ENGAGED_EVENTS_SCHOOL}) u
            GROUP BY u.post_id
          ) t`,
          sParams
        );
        const distinctWithActivity = Number(countRow[0]?.c ?? 0);
        const listTotal = Math.min(5, distinctWithActivity);
        if (listTotal === 0 || offsetNum >= listTotal) {
          posts = [];
          total = listTotal;
        } else {
          const [ranked] = await pool.execute(
            `SELECT p.id, p.created_at, g.eng
             FROM (
               SELECT u.post_id, COUNT(*) AS eng
               FROM (${SQL_ENGAGED_EVENTS_SCHOOL}) u
               GROUP BY u.post_id
             ) g
             INNER JOIN posts p ON p.id = g.post_id
             ORDER BY g.eng DESC, p.created_at DESC
             LIMIT 5`,
            sParams
          );
          const sortedByDate = [...ranked].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          );
          const paged = sortedByDate.slice(offsetNum, offsetNum + limitNum);
          const postIds = paged.map((r) => r.id);
          posts = await loadPostsRowsByIdOrder(
            pool,
            postIds,
            likeScrapUserId,
            whereAnd,
            params
          );
          total = listTotal;
        }
      } else if (sort === 'popular' && !search && boardType === 'national') {
        usedEngagementPopular = true;
        const { start, end } = getKstThreeDaysThroughToday235959UtcForSql();
        const w6 = engagementWindowParams6(start, end);
        const [countRow] = await pool.execute(
          `SELECT COUNT(*) AS c FROM (
            SELECT u.post_id
            FROM (${SQL_ENGAGED_EVENTS_NATIONAL}) u
            GROUP BY u.post_id
            HAVING COUNT(*) > 5
          ) t`,
          w6
        );
        const eligible = Number(countRow[0]?.c ?? 0);
        if (eligible === 0) {
          posts = [];
          total = 0;
        } else {
          // prepared statement + LIMIT ? / OFFSET ? 는 MySQL 1210(ER_WRONG_ARGUMENTS)로 실패하는 경우가 있어 정수만 삽입
          const safeLimit = Math.max(1, Math.min(100, Number(limitNum) || 20));
          const safeOffset = Math.max(0, Number(offsetNum) || 0);
          const [idRows] = await pool.execute(
            `SELECT p.id
             FROM (
               SELECT u.post_id, COUNT(*) AS eng
               FROM (${SQL_ENGAGED_EVENTS_NATIONAL}) u
               GROUP BY u.post_id
               HAVING COUNT(*) > 5
             ) g
             INNER JOIN posts p ON p.id = g.post_id
             ORDER BY g.eng DESC, p.created_at DESC
             LIMIT ${safeLimit} OFFSET ${safeOffset}`,
            w6
          );
          const postIds = idRows.map((r) => r.id);
          posts = await loadPostsRowsByIdOrder(
            pool,
            postIds,
            likeScrapUserId,
            whereAnd,
            params
          );
          total = eligible;
        }
      }
    }

    if (posts.length === 0 && total === 0 && !usedEngagementPopular) {
      const [dbRows] = await pool.execute(
        `SELECT
        p.id, 
        p.user_id, 
        p.board_type, 
        p.school_id, 
        p.content, 
        p.latitude,
        p.longitude,
        p.like_count, 
        p.comment_count, 
        p.created_at,
        u.name_enc as author_name_enc,
        u.color_id,
        s.name as school_name,
        (SELECT pi1.cloudinary_url
           FROM post_images pi1
          WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
          ORDER BY pi1.display_order ASC
          LIMIT 1) AS thumbnail,
        (SELECT COUNT(*) FROM post_likes pl
          WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM post_scraps ps
          WHERE ps.post_id = p.id AND ps.user_id = ?) AS is_scrapped,
        (SELECT COUNT(*) FROM post_scraps ps_cnt
          WHERE ps_cnt.post_id = p.id) AS scrap_count,
        (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', t.id, 'name', t.name))
           FROM post_tags pt
           INNER JOIN tags t ON pt.tag_id = t.id
          WHERE pt.post_id = p.id) AS tags
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN schools s ON p.school_id = s.school_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limitNum} OFFSET ${offsetNum}`,
        listParams
      );
      posts = dbRows;

      // 전체 개수 조회 (삭제 제외)
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
        params
      );
      total = Number(countResult[0]?.total ?? 0);
    }

    const postsForClient = posts.map((p) => {
      const {
        user_id,
        is_liked,
        is_scrapped,
        scrap_count,
        tags: rawTags,
        latitude: postLat,
        longitude: postLng,
        ...rest
      } = p;
      let tags = [];
      if (Array.isArray(rawTags)) {
        tags = rawTags;
      } else if (rawTags != null && typeof rawTags === 'object') {
        tags = [rawTags];
      } else if (rawTags != null && typeof rawTags === 'string' && rawTags.startsWith('[')) {
        try {
          const parsed = JSON.parse(rawTags);
          if (Array.isArray(parsed)) {
            tags = parsed;
          } else if (parsed != null && typeof parsed === 'object') {
            tags = [parsed];
          }
        } catch {
          tags = [];
        }
      }
      let distanceKm = null;
      if (
        hasViewerCoords &&
        postLat != null &&
        postLng != null &&
        !Number.isNaN(Number(postLat)) &&
        !Number.isNaN(Number(postLng))
      ) {
        distanceKm =
          Math.round(haversineKm(vLat, vLng, Number(postLat), Number(postLng)) * 10) / 10;
      }
      return {
        ...rest,
        tags,
        distanceKm,
        is_author: !!userId && user_id === userId,
        author_user_id: user_id,
        isLiked: Boolean(Number(is_liked) > 0),
        isScrapped: Boolean(Number(is_scrapped) > 0),
        scrapCount: Number(scrap_count) || 0,
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsForClient,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      }
    });
  } catch (error) {
    console.error('게시글 목록 조회 오류:', error);
    const detail = error?.message || String(error);
    res.status(500).json({
      success: false,
      message: '게시글 목록 조회 중 오류가 발생했습니다.',
      errorDetail: detail,
    });
  }
});

// 내가 쓴 글 목록
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
    } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(
      0,
      (parseInt(page, 10) - 1) * limitNum,
    );

    const conditions = ['p.user_id = ?'];
    const params = [userId];

    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    if (search) {
      conditions.push('p.content LIKE ?');
      params.push(`%${search}%`);
    }

    appendUserBlockFilter(conditions, params, userId, 'p.user_id');

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE AND p.is_hidden = FALSE`
        : 'WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE';

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy =
        'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    const likeScrapUserId = userId;
    const listParams = [likeScrapUserId, likeScrapUserId, ...params];
    const [posts] = await pool.execute(
      `SELECT
         p.id,
         p.user_id,
         p.board_type,
         p.school_id,
         p.content,
         p.like_count,
         p.comment_count,
         p.created_at,
         u.name_enc as author_name_enc,
         u.color_id,
         s.name as school_name,
         (SELECT COUNT(*) FROM post_likes pl
           WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
         (SELECT COUNT(*) FROM post_scraps ps
           WHERE ps.post_id = p.id AND ps.user_id = ?) AS is_scrapped,
         (SELECT COUNT(*) FROM post_scraps ps_cnt
           WHERE ps_cnt.post_id = p.id) AS scrap_count,
         (SELECT pi1.cloudinary_url
            FROM post_images pi1
           WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
           ORDER BY pi1.display_order ASC
           LIMIT 1) AS thumbnail
       FROM posts p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN schools s ON p.school_id = s.school_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      listParams,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM posts p
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0]?.total ?? 0);

    const postsForClient = posts.map((p) => {
      const { user_id, is_liked, is_scrapped, scrap_count, ...rest } = p;
      return {
        ...rest,
        author_user_id: user_id,
        isLiked: Boolean(Number(is_liked) > 0),
        isScrapped: Boolean(Number(is_scrapped) > 0),
        scrapCount: Number(scrap_count) || 0,
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsForClient,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내가 쓴 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내가 쓴 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 내가 쓴 숨김 글 목록
router.get('/my/hidden', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [posts] = await pool.execute(
      `SELECT
         p.id,
         p.board_type,
         p.school_id,
         p.content,
         p.like_count,
         p.comment_count,
         p.created_at,
         p.hidden_reason,
         p.hidden_at,
         p.hidden_by_report_count,
         s.name AS school_name
       FROM posts p
       LEFT JOIN schools s ON p.school_id = s.school_id
       WHERE p.user_id = ?
         AND p.is_deleted = FALSE
         AND p.is_hidden = TRUE
       ORDER BY p.hidden_at DESC, p.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM posts p
       WHERE p.user_id = ?
         AND p.is_deleted = FALSE
         AND p.is_hidden = TRUE`,
      [userId]
    );
    const total = Number(countRows[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내 숨김 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 숨김 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 좋아요 누른 글 목록
router.get('/liked', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
    } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(
      0,
      (parseInt(page, 10) - 1) * limitNum,
    );

    const conditions = ['pl.user_id = ?'];
    const params = [userId];

    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    if (search) {
      conditions.push('p.content LIKE ?');
      params.push(`%${search}%`);
    }

    appendUserBlockFilter(conditions, params, userId, 'p.user_id');

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE AND p.is_hidden = FALSE`
        : 'WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE';

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy =
        'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    const [posts] = await pool.execute(
      `SELECT
         p.id,
         p.user_id,
         p.board_type,
         p.school_id,
         p.content,
         p.like_count,
         p.comment_count,
         p.created_at,
         u.name_enc as author_name_enc,
         u.color_id,
         s.name as school_name,
         (SELECT pi1.cloudinary_url
            FROM post_images pi1
           WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
           ORDER BY pi1.display_order ASC
           LIMIT 1) AS thumbnail
       FROM post_likes pl
       INNER JOIN posts p ON pl.post_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN schools s ON p.school_id = s.school_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      params,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM post_likes pl
       INNER JOIN posts p ON pl.post_id = p.id
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('좋아요 누른 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '좋아요 누른 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 스크랩한 글 목록 (응답 형태는 GET /liked 와 동일)
router.get('/scrapped', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      boardType,
      schoolId,
      page = 1,
      limit = 20,
      search,
      sort = 'latest',
    } = req.query;

    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(
      0,
      (parseInt(page, 10) - 1) * limitNum,
    );

    const conditions = ['ps.user_id = ?'];
    const params = [userId];

    if (boardType) {
      conditions.push('p.board_type = ?');
      params.push(boardType);
    }

    if (schoolId) {
      conditions.push('p.school_id = ?');
      params.push(schoolId);
    }

    if (search) {
      conditions.push('p.content LIKE ?');
      params.push(`%${search}%`);
    }

    appendUserBlockFilter(conditions, params, userId, 'p.user_id');

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')} AND p.is_deleted = FALSE AND p.is_hidden = FALSE`
        : 'WHERE p.is_deleted = FALSE AND p.is_hidden = FALSE';

    let orderBy = 'p.created_at DESC';
    if (sort === 'popular') {
      orderBy =
        'p.like_count DESC, p.comment_count DESC, p.created_at DESC';
    } else if (sort === 'comments') {
      orderBy = 'p.comment_count DESC, p.created_at DESC';
    }

    const likeScrapUserId = userId;
    const listParams = [likeScrapUserId, likeScrapUserId, ...params];
    const [posts] = await pool.execute(
      `SELECT
         p.id,
         p.user_id,
         p.board_type,
         p.school_id,
         p.content,
         p.like_count,
         p.comment_count,
         p.created_at,
         u.name_enc as author_name_enc,
         u.color_id,
         s.name as school_name,
         (SELECT COUNT(*) FROM post_likes pl
           WHERE pl.post_id = p.id AND pl.user_id = ?) AS is_liked,
         (SELECT COUNT(*) FROM post_scraps ps2
           WHERE ps2.post_id = p.id AND ps2.user_id = ?) AS is_scrapped,
         (SELECT COUNT(*) FROM post_scraps ps_cnt
           WHERE ps_cnt.post_id = p.id) AS scrap_count,
         (SELECT pi1.cloudinary_url
            FROM post_images pi1
           WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
           ORDER BY pi1.display_order ASC
           LIMIT 1) AS thumbnail
       FROM post_scraps ps
       INNER JOIN posts p ON ps.post_id = p.id
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN schools s ON p.school_id = s.school_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      listParams,
    );

    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM post_scraps ps
       INNER JOIN posts p ON ps.post_id = p.id
       ${whereClause}`,
      params,
    );
    const total = Number(countResult[0]?.total ?? 0);

    const postsForClient = posts.map((p) => {
      const { user_id, is_liked, is_scrapped, scrap_count, ...rest } = p;
      return {
        ...rest,
        author_user_id: user_id,
        isLiked: Boolean(Number(is_liked) > 0),
        isScrapped: Boolean(Number(is_scrapped) > 0),
        scrapCount: Number(scrap_count) || 0,
      };
    });

    res.json({
      success: true,
      data: {
        posts: postsForClient,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('스크랩한 글 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '스크랩한 글 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

// 내가 접수한 신고 내역
router.get('/reports/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [rows] = await pool.execute(
      `SELECT
         r.id,
         r.target_type,
         r.target_id,
         r.reason,
         r.description,
         r.status,
         r.created_at,
         r.reviewed_at,
         CASE
           WHEN r.target_type = 'post' THEN (SELECT p.content FROM posts p WHERE p.id = r.target_id)
           WHEN r.target_type = 'comment' THEN (SELECT c.content FROM comments c WHERE c.id = r.target_id)
           WHEN r.target_type = 'school_mail' THEN (SELECT sm.content FROM school_mails sm WHERE sm.id = r.target_id)
           WHEN r.target_type = 'school_mail_comment' THEN (SELECT smc.content FROM school_mail_comments smc WHERE smc.id = r.target_id)
           ELSE NULL
         END AS target_content
       FROM reports r
       WHERE r.reporter_id = ?
       ORDER BY r.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM reports WHERE reporter_id = ?',
      [userId]
    );
    const total = Number(countRows[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        reports: rows,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내 신고 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '내 신고 내역 조회 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 상세 조회 - 선택적 인증으로 본인 글 여부 반환
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId ?? null;
    const { viewerLat, viewerLng } = req.query;
    const vLat =
      viewerLat != null && viewerLat !== '' ? parseFloat(viewerLat) : NaN;
    const vLng =
      viewerLng != null && viewerLng !== '' ? parseFloat(viewerLng) : NaN;
    const hasViewerCoords =
      !Number.isNaN(vLat) &&
      !Number.isNaN(vLng) &&
      vLat >= -90 &&
      vLat <= 90 &&
      vLng >= -180 &&
      vLng <= 180;

    const [posts] = await pool.execute(
      `SELECT 
        p.id, 
        p.user_id, 
        p.board_type, 
        p.school_id, 
        p.content,
        p.is_hidden,
        p.latitude,
        p.longitude,
        p.like_count, 
        p.comment_count, 
        p.created_at,
        u.name_enc as author_name_enc,
        u.color_id,
        s.name as school_name,
        (SELECT pi1.cloudinary_url
           FROM post_images pi1
          WHERE pi1.post_id = p.id AND pi1.deleted_at IS NULL
          ORDER BY pi1.display_order ASC, pi1.id ASC
          LIMIT 1) AS thumbnail,
        (SELECT JSON_ARRAYAGG(cloudinary_url)
         FROM (
           SELECT cloudinary_url
           FROM post_images
           WHERE post_id = p.id AND deleted_at IS NULL
           ORDER BY display_order ASC
         ) pi) AS images
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN schools s ON p.school_id = s.school_id
      WHERE p.id = ? AND p.is_deleted = FALSE`,
      [id]
    );

    if (posts.length === 0) {
      console.warn('[GET /api/posts/:id] 게시글 없음', { id, userId });
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    const post = posts[0];
    if (post.is_hidden && post.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    if (
      userId &&
      post.user_id !== userId &&
      (await isBlockedBy({ blockerUserId: userId, targetUserId: post.user_id }))
    ) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }
    const images = normalizePostImagesFromRow(post.images);

    console.log('[GET /api/posts/:id] 게시글 조회 성공', {
      id,
      userId,
      postUserId: post.user_id,
      boardType: post.board_type,
      schoolId: post.school_id,
    });

    // 해시태그 목록 조회
    const [postTags] = await pool.execute(
      `SELECT 
        t.id,
        t.name
      FROM post_tags pt
      INNER JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = ?
      ORDER BY t.name`,
      [id]
    );

    // 사용자가 좋아요를 눌렀는지 확인
    let isLiked = false;
    let isScrapped = false;
    if (userId) {
      const [likes] = await pool.execute(
        'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      isLiked = likes.length > 0;

      const [userScrapRows] = await pool.execute(
        'SELECT COUNT(*) AS c FROM post_scraps WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      isScrapped = Number(userScrapRows[0]?.c ?? 0) > 0;
    }

    const [scrapTotalRows] = await pool.execute(
      'SELECT COUNT(*) AS c FROM post_scraps WHERE post_id = ?',
      [id]
    );
    const scrapCount = Number(scrapTotalRows[0]?.c ?? 0);

    const isMine = !!userId && post.user_id === userId;
    const postAuthorId = post.user_id;
    const { user_id, images: _rawImages, latitude, longitude, ...postSafe } =
      post;

    let distanceKm = null;
    if (
      hasViewerCoords &&
      latitude != null &&
      longitude != null &&
      !Number.isNaN(Number(latitude)) &&
      !Number.isNaN(Number(longitude))
    ) {
      distanceKm =
        Math.round(
          haversineKm(vLat, vLng, Number(latitude), Number(longitude)) * 10,
        ) / 10;
    }

    console.log('[GET /api/posts/:id] 응답 데이터', {
      id: postSafe.id,
      isMine,
      post_author_id: postAuthorId,
      current_user_id: userId ?? null,
    });

    res.json({
      success: true,
      data: {
        ...postSafe,
        distanceKm,
        isLiked,
        isScrapped,
        scrapCount,
        isMine,
        post_author_id: postAuthorId,
        current_user_id: userId ?? null,
        images,
        tags: postTags,
      },
    });
  } catch (error) {
    console.error('게시글 상세 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '게시글 상세 조회 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 작성
router.post('/', authenticate, blockWhenFlag('post_write_disabled'), uploadPost.array('images', 5), validate(postCreateValidators), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { boardType, schoolId, content, tags } = req.body;
    const rawContent = typeof content === 'string' ? content : String(content ?? '');

    if (!boardType || !rawContent.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: '게시판 유형과 내용을 입력해주세요.' 
      });
    }

    if (boardType === 'school' && !schoolId) {
      return res.status(400).json({ 
        success: false, 
        message: '학교 게시판은 학교 ID가 필요합니다.' 
      });
    }

    // 사용자 정보 확인
    const [users] = await pool.execute(
      'SELECT school_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const user = users[0];

    // 학교 게시판인 경우 사용자의 학교와 일치하는지 확인
    if (boardType === 'school' && user.school_id !== String(schoolId)) {
      return res.status(403).json({ 
        success: false, 
        message: '본인 학교 게시판에만 글을 작성할 수 있습니다.' 
      });
    }

    const connection = await pool.getConnection();
    let postId;
    try {
      await connection.beginTransaction();
      const now = getNowForDB();

      let postLat = null;
      let postLng = null;
      const includeLoc =
        req.body.includeLocation === true ||
        req.body.includeLocation === 'true' ||
        req.body.includeLocation === '1';
      if (includeLoc) {
        const la = parseFloat(req.body.latitude);
        const lo = parseFloat(req.body.longitude);
        if (
          !Number.isNaN(la) &&
          !Number.isNaN(lo) &&
          la >= -90 &&
          la <= 90 &&
          lo >= -180 &&
          lo <= 180
        ) {
          postLat = la;
          postLng = lo;
        }
      }

      const [result] = await connection.execute(
        `INSERT INTO posts (user_id, board_type, school_id, content, latitude, longitude, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          boardType,
          boardType === 'school' ? schoolId : null,
          rawContent,
          postLat,
          postLng,
          now,
        ],
      );

      postId = result.insertId;

      if (req.files && req.files.length > 0) {
        const imageValues = req.files.map((file, index) => [
          postId,
          file.path,
          file.filename,
          index,
        ]);
        await connection.query(
          'INSERT INTO post_images (post_id, cloudinary_url, cloudinary_public_id, display_order) VALUES ?',
          [imageValues],
        );
      }

      if (
        (boardType === 'national' || boardType === 'school') &&
        Array.isArray(tags) &&
        tags.length > 0
      ) {
        for (let rawTag of tags) {
          if (rawTag == null) continue;
          let name = String(rawTag).trim();
          if (!name) continue;
          if (!name.startsWith('#')) {
            name = `#${name}`;
          }
          if (name.length > 50) {
            name = name.slice(0, 50);
          }

          let tagId;
          const [existingTags] = await connection.execute(
            'SELECT id FROM tags WHERE name = ?',
            [name],
          );
          if (existingTags.length > 0) {
            tagId = existingTags[0].id;
          } else {
            const [tagResult] = await connection.execute(
              'INSERT INTO tags (name, created_at) VALUES (?, ?)',
              [name, now],
            );
            tagId = tagResult.insertId;
          }

          await connection.execute(
            'INSERT IGNORE INTO post_tags (post_id, tag_id, created_at) VALUES (?, ?, ?)',
            [postId, tagId, now],
          );
        }
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: '게시글이 작성되었습니다.',
        data: {
          postId,
        },
      });
    } catch (txError) {
      await connection.rollback();
      if (req.files?.length) {
        try {
          const publicIds = req.files.map((f) => f.filename).filter(Boolean);
          if (publicIds.length) {
            await cloudinary.api.delete_resources(publicIds);
          }
        } catch (cleanupErr) {
          console.error('게시글 작성 롤백 후 Cloudinary 정리 실패:', cleanupErr);
        }
      }
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('게시글 작성 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '게시글 작성 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 삭제 (본인 글만)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [posts] = await pool.execute(
      'SELECT id, user_id, board_type, school_id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id]
    );
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }
    if (posts[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '본인이 작성한 글만 삭제할 수 있습니다.',
      });
    }

    await pool.execute('UPDATE posts SET is_deleted = TRUE WHERE id = ?', [id]);
    // 연결된 이미지도 소프트 딜리트
    await pool.query(
      'UPDATE post_images SET deleted_at = NOW() WHERE post_id = ? AND deleted_at IS NULL',
      [id]
    );

    res.json({
      success: true,
      message: '게시글이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '게시글 삭제 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 좋아요
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    // 게시글 존재 확인 (삭제되지 않은 글만)
    const [posts] = await pool.execute(
      'SELECT id, user_id, content FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id],
    );
    if (posts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '게시글을 찾을 수 없습니다.' 
      });
    }

    // 이미 좋아요를 눌렀는지 확인
    const [existingLikes] = await pool.execute(
      'SELECT id FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, id]
    );

    if (existingLikes.length > 0) {
      // 좋아요 취소
      await pool.execute(
        'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
        [userId, id]
      );
      await pool.execute(
        'UPDATE posts SET like_count = like_count - 1 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: '좋아요가 취소되었습니다.',
        data: { isLiked: false }
      });
    } else {
      // 좋아요 추가
      await pool.execute(
        'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
        [userId, id]
      );
      await pool.execute(
        'UPDATE posts SET like_count = like_count + 1 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: '좋아요가 추가되었습니다.',
        data: { isLiked: true }
      });
    }
  } catch (error) {
    console.error('게시글 좋아요 오류:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '이미 좋아요를 누른 게시글입니다.' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: '좋아요 처리 중 오류가 발생했습니다.' 
    });
  }
});

// 게시글 스크랩 토글
router.post('/:id/scrap', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const [posts] = await pool.execute(
      'SELECT id FROM posts WHERE id = ? AND is_deleted = FALSE',
      [id],
    );
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM post_scraps WHERE user_id = ? AND post_id = ?',
      [userId, id],
    );

    if (existing.length > 0) {
      await pool.execute(
        'DELETE FROM post_scraps WHERE user_id = ? AND post_id = ?',
        [userId, id],
      );
      return res.json({ success: true, scrapped: false });
    }

    await pool.execute(
      'INSERT INTO post_scraps (user_id, post_id) VALUES (?, ?)',
      [userId, id],
    );
    res.json({ success: true, scrapped: true });
  } catch (error) {
    console.error('게시글 스크랩 오류:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: '이미 스크랩한 게시글입니다.',
      });
    }
    res.status(500).json({
      success: false,
      message: '스크랩 처리 중 오류가 발생했습니다.',
    });
  }
});

// 게시글 신고
router.post('/:id/report', authenticate, blockWhenFlag('report_submission_disabled'), validate(postReportValidators), async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { id } = req.params;
    const { reason, description } = req.body;

    const result = await submitContentReport({
      reporterId,
      targetType: 'post',
      targetId: id,
      reason,
      description,
      options: {
        autoHidePost: true,
        targetExistsCheck: {
          notFoundMessage: '게시글을 찾을 수 없습니다.',
          check: async (db) => {
            const [rows] = await db.execute(
              'SELECT id FROM posts WHERE id = ? AND is_deleted = FALSE',
              [id],
            );
            return rows.length > 0;
          },
        },
      },
    });

    return res.status(result.httpStatus).json(result.body);
  } catch (error) {
    console.error('게시글 신고 오류:', error);
    res.status(500).json({
      success: false,
      message: '신고 처리 중 오류가 발생했습니다.',
    });
  }
});

// 숨김 게시글 이의신청 등록
router.post('/:id/appeal', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { content } = req.body;

    const appealContent = String(content ?? '').trim();
    if (!appealContent) {
      return res.status(400).json({
        success: false,
        message: '소명 내용을 입력해주세요.',
      });
    }

    const [posts] = await pool.execute(
      `SELECT id, user_id, is_hidden, is_deleted
       FROM posts
       WHERE id = ?`,
      [id]
    );
    if (posts.length === 0 || posts[0].is_deleted) {
      return res.status(404).json({
        success: false,
        message: '게시글을 찾을 수 없습니다.',
      });
    }
    const post = posts[0];
    if (post.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '본인 게시글에만 이의신청할 수 있습니다.',
      });
    }
    if (!post.is_hidden) {
      return res.status(400).json({
        success: false,
        message: '현재 숨김 처리된 게시글이 아닙니다.',
      });
    }

    const [existingAppeals] = await pool.execute(
      `SELECT id
       FROM report_appeals
       WHERE post_id = ?
         AND appellant_id = ?
         AND status = 'pending'
       LIMIT 1`,
      [id, userId]
    );
    if (existingAppeals.length > 0) {
      return res.status(400).json({
        success: false,
        message: '이미 접수된 이의신청이 있습니다.',
      });
    }

    const [appealInsert] = await pool.execute(
      `INSERT INTO report_appeals (post_id, appellant_id, content)
       VALUES (?, ?, ?)`,
      [id, userId, appealContent]
    );

    notifyAppealCreated({
      appealId: appealInsert.insertId,
      postId: id,
      appellantId: userId,
      content: appealContent,
    });

    res.status(201).json({
      success: true,
      message: '이의신청이 접수되었습니다.',
    });
  } catch (error) {
    console.error('이의신청 등록 오류:', error);
    res.status(500).json({
      success: false,
      message: '이의신청 처리 중 오류가 발생했습니다.',
    });
  }
});

// 내 이의신청 내역 조회
router.get('/appeals/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const offsetNum = Math.max(0, (parseInt(page, 10) - 1) * limitNum);

    const [rows] = await pool.execute(
      `SELECT
         ra.id,
         ra.post_id,
         ra.content,
         ra.status,
         ra.review_note,
         ra.reviewed_by,
         ra.reviewed_at,
         ra.created_at,
         p.content AS post_content,
         p.hidden_reason,
         p.hidden_at
       FROM report_appeals ra
       INNER JOIN posts p ON p.id = ra.post_id
       WHERE ra.appellant_id = ?
       ORDER BY ra.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM report_appeals WHERE appellant_id = ?',
      [userId]
    );
    const total = Number(countRows[0]?.total ?? 0);

    res.json({
      success: true,
      data: {
        appeals: rows,
        pagination: {
          page: parseInt(page, 10),
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('내 이의신청 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '이의신청 내역 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
