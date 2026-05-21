-- 쪽지: 채팅방·메시지 소프트 삭제 (카카오톡 스타일)
ALTER TABLE message_rooms ADD COLUMN is_deleted_by_user1 BOOLEAN DEFAULT FALSE;
ALTER TABLE message_rooms ADD COLUMN is_deleted_by_user2 BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;

-- 게시글 스크랩
CREATE TABLE IF NOT EXISTS post_scraps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_scrap (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
