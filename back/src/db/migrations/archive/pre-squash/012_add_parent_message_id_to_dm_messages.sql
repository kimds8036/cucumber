ALTER TABLE dm_messages 
ADD COLUMN parent_message_id INT NULL COMMENT '답장 대상 메시지 ID',
ADD FOREIGN KEY (parent_message_id) REFERENCES dm_messages(id) ON DELETE SET NULL;
