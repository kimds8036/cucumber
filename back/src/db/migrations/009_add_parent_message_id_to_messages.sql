ALTER TABLE messages
  ADD COLUMN parent_message_id INT NULL AFTER sender_id,
  ADD INDEX idx_parent_message_id (parent_message_id),
  ADD CONSTRAINT fk_messages_parent_message
    FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL;

