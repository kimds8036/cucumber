ALTER TABLE dm_messages MODIFY COLUMN content TEXT NULL;

CREATE TABLE IF NOT EXISTS dm_message_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dm_message_id INT NOT NULL,
  cloudinary_url VARCHAR(500) NOT NULL,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  display_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (dm_message_id) REFERENCES dm_messages(id) ON DELETE CASCADE,
  INDEX idx_dm_message_id (dm_message_id)
);
