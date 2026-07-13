ALTER TABLE dm_rooms
  ADD COLUMN is_deleted_by_user1 BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_deleted_by_user2 BOOLEAN DEFAULT FALSE,
  ADD COLUMN deleted_at_msg_id_user1 INT DEFAULT NULL,
  ADD COLUMN deleted_at_msg_id_user2 INT DEFAULT NULL;

ALTER TABLE personal_mail_rooms
  ADD COLUMN is_deleted_by_user1 BOOLEAN DEFAULT FALSE,
  ADD COLUMN is_deleted_by_user2 BOOLEAN DEFAULT FALSE;
