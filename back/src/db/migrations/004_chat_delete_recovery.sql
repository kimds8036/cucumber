ALTER TABLE message_rooms
ADD COLUMN deleted_at_msg_id_user1 INT DEFAULT NULL,
ADD COLUMN deleted_at_msg_id_user2 INT DEFAULT NULL;
