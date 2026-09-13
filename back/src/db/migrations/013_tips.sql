-- 인앱 팁 (관리자 작성 · 게시판 상단 고정 1개)

CREATE TABLE IF NOT EXISTS `tips` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `body` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '팁 문구',
  `status` enum('draft','active') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft' COMMENT '초안|활성',
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0 COMMENT '게시판 상단 고정(활성 중 최대 1개)',
  `created_by_admin_id` int DEFAULT NULL COMMENT '작성 관리자 admin_users.id',
  `updated_by_admin_id` int DEFAULT NULL COMMENT '최종 수정 관리자 admin_users.id',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tips_status_pinned` (`status`, `is_pinned`),
  KEY `idx_tips_created` (`created_at`),
  CONSTRAINT `fk_tips_created_by_admin`
    FOREIGN KEY (`created_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tips_updated_by_admin`
    FOREIGN KEY (`updated_by_admin_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='인앱 팁';

-- 기존 하드코딩 문구 시드 (이미 있으면 스킵)
INSERT INTO `tips` (`body`, `status`, `is_pinned`)
SELECT v.body, 'active', 0
FROM (
  SELECT '게시글에 해시태그를 달면 같은 관심사 친구들이 찾아올 수 있어요' AS body UNION ALL
  SELECT '좋아요가 많은 게시글은 인기 탭에서 더 많이 노출돼요' UNION ALL
  SELECT '개인우편은 상대방에게 익명으로 전달돼요' UNION ALL
  SELECT '학교 우편함에는 전국의 모든 학생들이 글을 남길 수 있어요' UNION ALL
  SELECT '학교 게시판은 우리 학교 학생들만 사용할 수 있어요' UNION ALL
  SELECT '개인우편에 상대방 정보를 잘못 입력하면 3시간 뒤 자동으로 반송돼요' UNION ALL
  SELECT '알림은 설정에서 따로 켜고 끌 수 있어요' UNION ALL
  SELECT '내 게시글에 댓글이 달리면 바로 알려드려요' UNION ALL
  SELECT '해시태그로 검색하면 관련 게시글을 한 번에 볼 수 있어요' UNION ALL
  SELECT '학교 이름으로 검색하면 다른 학교 정보도 구경할 수 있어요' UNION ALL
  SELECT '타이머로 공부하면 우리 학교 공부 잔디에 자동으로 기록돼요' UNION ALL
  SELECT '학교 공부 잔디로 우리 학교 학생들의 평균 공부 시간을 확인해 보세요' UNION ALL
  SELECT '급식 메뉴와 시간표를 앱에서 바로 확인할 수 있어요' UNION ALL
  SELECT '타이머 탭에서 친구들이 공부하고 있는지 확인할 수 있어요' UNION ALL
  SELECT '오늘의 공부 기록을 사진으로 저장할 수 있어요' UNION ALL
  SELECT '시간표를 사진으로 저장할 수 있어요' UNION ALL
  SELECT '게시판 거리 설정을 통해 근처 게시글이 보이는 반경을 지정해 보세요' UNION ALL
  SELECT '학적이 변동되면 관리자에게 문의해 주세요'
) AS v
WHERE NOT EXISTS (SELECT 1 FROM `tips` LIMIT 1);
