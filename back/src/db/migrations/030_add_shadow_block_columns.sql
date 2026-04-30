ALTER TABLE messages
  ADD COLUMN is_shadow_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN shadow_blocked_for_user_id INT NULL,
  ADD INDEX idx_messages_shadow_blocked_for_user (shadow_blocked_for_user_id);

ALTER TABLE dm_messages
  ADD COLUMN is_shadow_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN shadow_blocked_for_user_id INT NULL,
  ADD INDEX idx_dm_messages_shadow_blocked_for_user (shadow_blocked_for_user_id);

ALTER TABLE personal_mails
  ADD COLUMN is_shadow_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN shadow_blocked_for_user_id INT NULL,
  ADD INDEX idx_personal_mails_shadow_blocked_for_user (shadow_blocked_for_user_id);
