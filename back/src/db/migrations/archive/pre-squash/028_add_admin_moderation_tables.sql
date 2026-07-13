-- 관리자 제재/감사 로그 확장

ALTER TABLE users
  ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE COMMENT '임시 정지 여부',
  ADD COLUMN suspended_until TIMESTAMP NULL COMMENT '임시 정지 해제 시각',
  ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE COMMENT '영구 정지 여부',
  ADD COLUMN is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '화이트리스트 여부';

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '관리자 로그 ID',
  admin_user_id INT NOT NULL COMMENT '관리자 사용자 ID',
  action_type VARCHAR(50) NOT NULL COMMENT '액션 타입(report_confirm/report_reject/appeal_update/user_suspend/user_ban/user_whitelist)',
  target_type VARCHAR(50) NOT NULL COMMENT '대상 타입(report/appeal/user)',
  target_id INT NOT NULL COMMENT '대상 ID',
  note TEXT NULL COMMENT '관리자 메모',
  extra JSON NULL COMMENT '부가 데이터',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성 시각',
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_admin_audit_created_at (created_at),
  INDEX idx_admin_audit_target (target_type, target_id),
  INDEX idx_admin_audit_action_type (action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 감사 로그';
