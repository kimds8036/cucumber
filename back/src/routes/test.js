/**
 * 테스트 환경 전용 라우트
 *
 * - GET /api/test/users : users 테이블 테스트 계정 목록 (시드 시 별도 생성 필요)
 *   학교/학년/반/사용 여부(in_use) 와 함께 반환.
 *
 * 운영 배포 시에는 이 라우트를 비활성화하거나 보호 미들웨어로 감싸야 함.
 *
 * ⚠️ ⚠️ ⚠️ 임시 개방 안내 ⚠️ ⚠️ ⚠️
 * 현재 production(Railway) 환경 변수에 ENABLE_TEST_API=true 가 설정되어 있어
 * 이 라우트가 외부에 노출된 상태다. 테스트 기간이 끝나면 반드시
 *   1) Railway 대시보드 → cucumber 서비스 → Variables → ENABLE_TEST_API=false
 *      (또는 변수 자체 삭제)
 *   2) `railway variables --service cucumber --set "ENABLE_TEST_API=false"`
 *      후 `railway redeploy --service cucumber --yes`
 * 둘 중 하나로 다시 닫아야 한다.
 * 닫지 않고 출시하면 모든 테스트 계정 username 이 인증 없이 노출된다.
 */

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// 프로덕션에서는 ENABLE_TEST_API=true 가 명시되어야만 사용 가능. 그 외엔 라우터 자체를 404 로 가린다.
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_TEST_API !== 'true') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

// GET /api/test/users
// query: ?prefix=user (기본값) — 해당 prefix로 시작하고 뒤에 숫자가 붙은 username 만 반환
router.get('/users', async (req, res) => {
  try {
    const prefix = String(req.query?.prefix || 'user').replace(/[^a-zA-Z0-9_]/g, '');
    if (!prefix) {
      return res.status(400).json({ success: false, message: 'prefix가 유효하지 않습니다.' });
    }

    const likePattern = `${prefix}%`;
    const regexPattern = `^${prefix}[0-9]+$`;
    const offsetForSort = prefix.length + 1; // SUBSTRING(... , offset)

    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.username,
         u.name,
         u.school_id,
         s.name AS school_name,
         u.grade,
         u.class_number,
         CASE
           WHEN EXISTS (
             SELECT 1 FROM fcm_tokens ft
             WHERE ft.user_id = u.id AND ft.is_active = TRUE
           ) THEN 1
           ELSE 0
         END AS in_use
       FROM users u
       LEFT JOIN schools s ON s.school_id = u.school_id
       WHERE u.username LIKE ?
         AND u.username REGEXP ?
       ORDER BY CAST(SUBSTRING(u.username, ?) AS UNSIGNED) ASC`,
      [likePattern, regexPattern, offsetForSort],
    );

    return res.json({
      success: true,
      data: {
        users: rows.map((r) => ({
          id: r.id,
          username: r.username,
          name: r.name,
          school_id: r.school_id,
          school_name: r.school_name,
          grade: r.grade,
          class_number: r.class_number,
          in_use: !!r.in_use,
        })),
      },
    });
  } catch (error) {
    console.error('테스트 사용자 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '테스트 사용자 목록 조회 중 오류가 발생했습니다.',
    });
  }
});

export default router;
