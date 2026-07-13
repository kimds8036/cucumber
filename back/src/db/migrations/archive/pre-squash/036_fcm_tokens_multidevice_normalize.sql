-- FCM: 멀티 디바이스(device_id), 데이터 정규화, users.fcm_token 제거 (멱등)

ALTER TABLE fcm_tokens ADD COLUMN device_id VARCHAR(64) NULL COMMENT '앱 설치 단위 ID';

UPDATE fcm_tokens SET device_id = CONCAT('legacy-row-', id) WHERE device_id IS NULL OR device_id = '';

ALTER TABLE fcm_tokens MODIFY COLUMN device_id VARCHAR(64) NOT NULL;

UPDATE fcm_tokens ft
INNER JOIN (
  SELECT user_id, device_id, MAX(id) AS keep_id
  FROM fcm_tokens
  WHERE is_active = TRUE
  GROUP BY user_id, device_id
) keep_rows ON ft.user_id = keep_rows.user_id
  AND ft.device_id = keep_rows.device_id
  AND ft.id <> keep_rows.keep_id
SET ft.is_active = FALSE, ft.updated_at = NOW()
WHERE ft.is_active = TRUE;

INSERT INTO fcm_tokens (user_id, device_id, token, is_active, last_used_at)
SELECT u.id, CONCAT('legacy-user-', u.id), TRIM(u.fcm_token), TRUE, NOW()
FROM users u
WHERE u.fcm_token IS NOT NULL AND TRIM(u.fcm_token) <> ''
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  device_id = VALUES(device_id),
  is_active = TRUE,
  last_used_at = NOW(),
  updated_at = NOW();

ALTER TABLE fcm_tokens ADD UNIQUE KEY uq_fcm_tokens_user_device (user_id, device_id);

ALTER TABLE users DROP COLUMN fcm_token;
