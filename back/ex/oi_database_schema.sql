-- Oi (Today's Story) Database Schema
-- PostgreSQL

-- 1. Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nickname VARCHAR(50) UNIQUE NOT NULL,
    profile_image_url TEXT,
    bio TEXT,
    
    social_provider VARCHAR(20),
    social_id VARCHAR(255),
    
    is_student BOOLEAN DEFAULT FALSE,
    school_id INTEGER,
    grade INTEGER,
    verified_at TIMESTAMP,
    
    nickname_changed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_is_student ON users(is_student);

-- 2. Schools Table
CREATE TABLE schools (
    school_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    school_type VARCHAR(20),
    region VARCHAR(100),
    
    total_students INTEGER DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_name ON schools(name);
CREATE INDEX idx_schools_region ON schools(region);

-- 3. Phone Verifications Table
CREATE TABLE phone_verifications (
    verification_id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(user_id),
    verification_code VARCHAR(6),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX idx_phone_verifications_user ON phone_verifications(user_id);

-- 4. Board Types Table
CREATE TABLE board_types (
    board_type_id SERIAL PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    requires_student_auth BOOLEAN DEFAULT FALSE
);

INSERT INTO board_types (type_code, name, description, requires_student_auth) VALUES
('doodle', 'Doodle Board', 'Main feed for all users', FALSE),
('free', 'Free Board', 'School-specific free board', TRUE),
('tell', 'Tell Board', 'School-specific message board', TRUE),
('ourschool', 'Our School', 'School promotion board (public)', TRUE);

-- 5. Places Table
CREATE TABLE places (
    place_id SERIAL PRIMARY KEY,
    google_place_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    place_type VARCHAR(100),
    
    post_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_places_location ON places(latitude, longitude);
CREATE INDEX idx_places_google_place ON places(google_place_id);

-- 6. Posts Table
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    board_type VARCHAR(50) NOT NULL,
    school_id INTEGER REFERENCES schools(school_id),
    
    content TEXT NOT NULL,
    images TEXT[],
    doodle_data JSONB,
    
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    place_id INTEGER REFERENCES places(place_id),
    
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_board ON posts(board_type);
CREATE INDEX idx_posts_school ON posts(school_id);
CREATE INDEX idx_posts_location ON posts(latitude, longitude);
CREATE INDEX idx_posts_place ON posts(place_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_deleted ON posts(is_deleted);

-- 7. Hashtags Table
CREATE TABLE hashtags (
    hashtag_id SERIAL PRIMARY KEY,
    tag VARCHAR(100) UNIQUE NOT NULL,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);
CREATE INDEX idx_hashtags_use_count ON hashtags(use_count DESC);

-- 8. Post Hashtags Table
CREATE TABLE post_hashtags (
    post_hashtag_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    hashtag_id INTEGER NOT NULL REFERENCES hashtags(hashtag_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(post_id, hashtag_id)
);

CREATE INDEX idx_post_hashtags_post ON post_hashtags(post_id);
CREATE INDEX idx_post_hashtags_hashtag ON post_hashtags(hashtag_id);

-- 9. Comments Table
CREATE TABLE comments (
    comment_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    parent_comment_id INTEGER REFERENCES comments(comment_id),
    
    content TEXT NOT NULL,
    
    like_count INTEGER DEFAULT 0,
    
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created ON comments(created_at);
CREATE INDEX idx_comments_deleted ON comments(is_deleted);

-- 10. Post Likes Table
CREATE TABLE post_likes (
    like_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);

-- 11. Comment Likes Table
CREATE TABLE comment_likes (
    like_id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(comment_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- 12. Canvas Pages Table
CREATE TABLE canvas_pages (
    page_id SERIAL PRIMARY KEY,
    place_id INTEGER NOT NULL REFERENCES places(place_id),
    page_number INTEGER NOT NULL,
    is_full BOOLEAN DEFAULT FALSE,
    stroke_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(place_id, page_number)
);

CREATE INDEX idx_canvas_pages_place ON canvas_pages(place_id);
CREATE INDEX idx_canvas_pages_page_number ON canvas_pages(page_number);

-- 13. Canvas Strokes Table
CREATE TABLE canvas_strokes (
    stroke_id SERIAL PRIMARY KEY,
    page_id INTEGER NOT NULL REFERENCES canvas_pages(page_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    
    stroke_data JSONB NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_canvas_strokes_page ON canvas_strokes(page_id);
CREATE INDEX idx_canvas_strokes_user ON canvas_strokes(user_id);
CREATE INDEX idx_canvas_strokes_created ON canvas_strokes(created_at);

-- 14. Chatrooms Table
CREATE TABLE chatrooms (
    chatroom_id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(user_id),
    user2_id INTEGER NOT NULL REFERENCES users(user_id),
    
    last_message TEXT,
    last_message_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

CREATE INDEX idx_chatrooms_user1 ON chatrooms(user1_id);
CREATE INDEX idx_chatrooms_user2 ON chatrooms(user2_id);
CREATE INDEX idx_chatrooms_last_message ON chatrooms(last_message_at DESC);

-- 15. Messages Table
CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    chatroom_id INTEGER NOT NULL REFERENCES chatrooms(chatroom_id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(user_id),
    
    content TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_chatroom ON messages(chatroom_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- 16. Reports Table
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(user_id),
    
    target_type VARCHAR(20) NOT NULL,
    target_id INTEGER NOT NULL,
    
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(user_id),
    reviewed_at TIMESTAMP,
    admin_note TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- 17. Blocks Table
CREATE TABLE blocks (
    block_id SERIAL PRIMARY KEY,
    blocker_id INTEGER NOT NULL REFERENCES users(user_id),
    blocked_id INTEGER NOT NULL REFERENCES users(user_id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- 18. Notifications Table
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    content TEXT,
    
    target_type VARCHAR(20),
    target_id INTEGER,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- 19. Activity Logs Table
CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    
    activity_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(20),
    target_id INTEGER,
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- Add Foreign Key Constraints
ALTER TABLE users ADD CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(school_id);
ALTER TABLE posts ADD CONSTRAINT fk_posts_board_type FOREIGN KEY (board_type) REFERENCES board_types(type_code);

-- Trigger Functions
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE post_id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = like_count - 1 WHERE post_id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE post_id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_post_comment_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET like_count = like_count + 1 WHERE comment_id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET like_count = like_count - 1 WHERE comment_id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

CREATE OR REPLACE FUNCTION update_school_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_student = TRUE THEN
        UPDATE schools SET total_students = total_students + 1 WHERE school_id = NEW.school_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_student = FALSE AND NEW.is_student = TRUE THEN
            UPDATE schools SET total_students = total_students + 1 WHERE school_id = NEW.school_id;
        ELSIF OLD.is_student = TRUE AND NEW.is_student = FALSE THEN
            UPDATE schools SET total_students = total_students - 1 WHERE school_id = OLD.school_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_school_student_count
AFTER INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_school_student_count();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Complex Indexes
CREATE INDEX idx_posts_board_school ON posts(board_type, school_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_posts_created_likes ON posts(created_at DESC, like_count DESC) WHERE is_deleted = FALSE;

-- Schema Migrations Table
CREATE TABLE schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO schema_migrations (version, description) VALUES
('1.0.0', 'Initial schema creation');
