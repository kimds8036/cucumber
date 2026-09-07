-- 소셜 가입: 프로필 아이디(공개 username) 미설정 플래그
ALTER TABLE user_settings
  ADD COLUMN profile_username_set TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '0=SignProfileUsername 미완료(카카오 등), 1=설정됨'
  AFTER last_username_change_at;

-- 이미 연동된 카카오·애플 + 임시 아이디(k… / a…) 사용자는 미설정으로
UPDATE user_settings us
INNER JOIN user_oauth_providers o
  ON o.user_id = us.user_id AND o.provider IN ('kakao', 'apple')
INNER JOIN users u ON u.id = us.user_id
SET us.profile_username_set = 0
WHERE u.username REGEXP '^[ka][0-9a-fA-F]+$';

INSERT INTO user_settings (user_id, profile_username_set)
SELECT o.user_id, 0
FROM user_oauth_providers o
LEFT JOIN user_settings us ON us.user_id = o.user_id
WHERE us.user_id IS NULL
  AND o.provider IN ('kakao', 'apple');
