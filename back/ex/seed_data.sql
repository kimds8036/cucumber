-- Oi Database Seed Data (Test Data)
-- UTF-8 Encoding
-- Use only in development/test environment!

-- 1. Schools Data
INSERT INTO schools (name, address, school_type, region) VALUES
('Seoul High School', 'Seoul Seocho-gu', 'High School', 'Seoul'),
('Gangnam Middle School', 'Seoul Gangnam-gu', 'Middle School', 'Seoul'),
('Busan High School', 'Busan Haeundae-gu', 'High School', 'Busan'),
('Jeju Middle School', 'Jeju-si', 'Middle School', 'Jeju'),
('Daejeon High School', 'Daejeon Yuseong-gu', 'High School', 'Daejeon');

-- 2. Test Users
-- Note: Password is 'password123' - needs bcrypt hashing: $2b$10$...hash...

-- Regular users (not students)
INSERT INTO users (email, password_hash, nickname, social_provider, is_student, created_at) VALUES
('user1@test.com', '$2b$10$YourHashHere', 'DoodleKing', 'email', FALSE, NOW()),
('user2@test.com', '$2b$10$YourHashHere', 'ArtistPro', 'email', FALSE, NOW()),
('user3@test.com', '$2b$10$YourHashHere', 'HappyToday', 'email', FALSE, NOW());

-- Student users (verified)
INSERT INTO users (email, password_hash, nickname, social_provider, is_student, school_id, grade, verified_at, created_at) VALUES
('student1@test.com', '$2b$10$YourHashHere', 'StudyKing', 'email', TRUE, 1, 2, NOW(), NOW()),
('student2@test.com', '$2b$10$YourHashHere', 'SoccerStar', 'email', TRUE, 1, 3, NOW(), NOW()),
('student3@test.com', '$2b$10$YourHashHere', 'ArtMaster', 'email', TRUE, 2, 1, NOW(), NOW()),
('student4@test.com', '$2b$10$YourHashHere', 'MusicLover', 'email', TRUE, 3, 2, NOW(), NOW()),
('student5@test.com', '$2b$10$YourHashHere', 'GamePro', 'email', TRUE, 1, 1, NOW(), NOW());

-- Social login users
INSERT INTO users (email, password_hash, nickname, social_provider, social_id, is_student, created_at) VALUES
('google_user@gmail.com', NULL, 'GoogleUser', 'google', 'google_123456', FALSE, NOW()),
('apple_user@icloud.com', NULL, 'AppleUser', 'apple', 'apple_789012', FALSE, NOW());

-- 3. Phone Verifications
INSERT INTO phone_verifications (phone_number, user_id, verified, verified_at, created_at) VALUES
('010-1234-5678', 4, TRUE, NOW(), NOW()),
('010-2345-6789', 5, TRUE, NOW(), NOW()),
('010-3456-7890', 6, TRUE, NOW(), NOW()),
('010-4567-8901', 7, TRUE, NOW(), NOW()),
('010-5678-9012', 8, TRUE, NOW(), NOW());

-- 4. Places Data
INSERT INTO places (google_place_id, name, address, latitude, longitude, place_type) VALUES
('ChIJ001', 'Starbucks Gangnam', 'Seoul Gangnam-gu', 37.4979, 127.0276, 'cafe'),
('ChIJ002', 'McDonalds Hongdae', 'Seoul Mapo-gu', 37.5563, 126.9233, 'restaurant'),
('ChIJ003', 'Seoul High School Gate', 'Seoul Seocho-gu', 37.4833, 127.0322, 'school'),
('ChIJ004', 'A Twosome Place Busan', 'Busan Haeundae-gu', 35.1628, 129.1638, 'cafe'),
('ChIJ005', 'Ediya Coffee Daejeon', 'Daejeon Yuseong-gu', 36.3504, 127.3845, 'cafe');

-- 5. Hashtags Data
INSERT INTO hashtags (tag, use_count) VALUES
('food', 15),
('niceweather', 12),
('study', 10),
('monday', 8),
('hungry', 20),
('test', 7),
('lunch', 5),
('festival', 3),
('sports', 4);

-- 6. Doodle Board Posts (All users)
INSERT INTO posts (user_id, board_type, content, latitude, longitude, place_id, like_count, comment_count, created_at) VALUES
-- Regular user posts
(1, 'doodle', 'Beautiful weather today! Perfect for a walk', 37.4979, 127.0276, 1, 5, 2, NOW() - INTERVAL '2 hours'),
(2, 'doodle', 'What should I eat for lunch? Any recommendations?', 37.5563, 126.9233, 2, 3, 4, NOW() - INTERVAL '1 hour'),
(3, 'doodle', 'Walking my dog, so cute! Took some photos', 37.4833, 127.0322, NULL, 12, 5, NOW() - INTERVAL '30 minutes'),

-- Student users also use doodle board
(4, 'doodle', 'At cafe with friends after school', 37.4979, 127.0276, 1, 8, 3, NOW() - INTERVAL '3 hours'),
(5, 'doodle', 'Soccer game was so fun today!', 37.4833, 127.0322, 3, 15, 7, NOW() - INTERVAL '4 hours');

-- 7. School Board Posts (Students only)

-- Seoul High School Free Board
INSERT INTO posts (user_id, board_type, school_id, content, like_count, comment_count, created_at) VALUES
(4, 'free', 1, 'What is the range for tomorrow math test?', 3, 5, NOW() - INTERVAL '5 hours'),
(5, 'free', 1, 'Today lunch was really good! Tteokbokki was the best', 10, 3, NOW() - INTERVAL '2 hours'),
(8, 'free', 1, 'Anyone want to play basketball after school?', 4, 6, NOW() - INTERVAL '1 hour');

-- Seoul High School Tell Board
INSERT INTO posts (user_id, board_type, school_id, content, created_at) VALUES
(4, 'tell', 1, 'Found AirPods in grade 3 class 2', NOW() - INTERVAL '6 hours'),
(5, 'tell', 1, 'Does grade 2 student Kim have a girlfriend?', NOW() - INTERVAL '4 hours'),
(8, 'tell', 1, 'Today lunch is pork cutlet!', NOW() - INTERVAL '3 hours');

-- Our School Board (Public)
INSERT INTO posts (user_id, board_type, school_id, content, images, like_count, comment_count, created_at) VALUES
(4, 'ourschool', 1, 'Our school festival was amazing! Sharing photos', 
    ARRAY['https://example.com/festival1.jpg', 'https://example.com/festival2.jpg'], 25, 12, NOW() - INTERVAL '1 day'),
(5, 'ourschool', 1, 'Seoul High baseball team won national championship!', 
    ARRAY['https://example.com/baseball.jpg'], 40, 20, NOW() - INTERVAL '2 days');

-- Gangnam Middle School Board
INSERT INTO posts (user_id, board_type, school_id, content, created_at) VALUES
(6, 'free', 2, 'Please help with math homework... so difficult', NOW() - INTERVAL '3 hours'),
(6, 'tell', 2, 'Lost pencil case in grade 1 class 3', NOW() - INTERVAL '5 hours');

-- 8. Post-Hashtag Connections
INSERT INTO post_hashtags (post_id, hashtag_id) VALUES
(1, 2), -- "Beautiful weather" -> #niceweather
(2, 1), -- "What to eat" -> #food
(2, 5), -- "What to eat" -> #hungry
(5, 8), -- "Soccer game" -> #festival
(7, 3), -- "Math test" -> #study
(8, 7), -- "Lunch was good" -> #lunch
(8, 5); -- "Lunch was good" -> #hungry

-- 9. Comments Data
INSERT INTO comments (post_id, user_id, content, like_count, created_at) VALUES
-- Doodle board comments
(1, 2, 'Really? I stayed home all day. Should I go out?', 2, NOW() - INTERVAL '1 hour 30 minutes'),
(1, 3, 'I want to go for a walk too!', 1, NOW() - INTERVAL '1 hour'),
(2, 1, 'I recommend pasta!', 3, NOW() - INTERVAL '45 minutes'),
(2, 3, 'My favorite is kimchi stew', 1, NOW() - INTERVAL '40 minutes'),

-- School board comments
(6, 5, 'Pages 15-30!', 2, NOW() - INTERVAL '4 hours'),
(6, 8, 'I am not sure either', 0, NOW() - INTERVAL '3 hours'),
(7, 4, 'It was so delicious! The portion was big too', 5, NOW() - INTERVAL '1 hour 30 minutes');

-- Replies (parent_comment_id set)
INSERT INTO comments (post_id, user_id, parent_comment_id, content, created_at) VALUES
(1, 1, 1, 'You should go out! Weather is really nice', NOW() - INTERVAL '1 hour 15 minutes'),
(2, 2, 3, 'Kimchi stew is good too!', NOW() - INTERVAL '35 minutes');

-- 10. Post Likes
INSERT INTO post_likes (post_id, user_id, created_at) VALUES
(1, 2, NOW() - INTERVAL '1 hour 45 minutes'),
(1, 3, NOW() - INTERVAL '1 hour 30 minutes'),
(1, 4, NOW() - INTERVAL '1 hour'),
(2, 1, NOW() - INTERVAL '50 minutes'),
(2, 4, NOW() - INTERVAL '45 minutes'),
(3, 1, NOW() - INTERVAL '25 minutes'),
(3, 2, NOW() - INTERVAL '20 minutes'),
(3, 4, NOW() - INTERVAL '15 minutes'),
(7, 4, NOW() - INTERVAL '2 hours'),
(7, 5, NOW() - INTERVAL '1 hour 30 minutes'),
(7, 8, NOW() - INTERVAL '1 hour');

-- Comment Likes
INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES
(1, 1, NOW() - INTERVAL '1 hour 20 minutes'),
(1, 3, NOW() - INTERVAL '1 hour 10 minutes'),
(3, 2, NOW() - INTERVAL '40 minutes'),
(3, 4, NOW() - INTERVAL '35 minutes');

-- 11. Canvas Data

-- Starbucks Gangnam canvas pages
INSERT INTO canvas_pages (place_id, page_number, is_full, stroke_count) VALUES
(1, 1, FALSE, 5),
(1, 2, FALSE, 2);

-- Canvas strokes (simple example)
INSERT INTO canvas_strokes (page_id, user_id, stroke_data, created_at) VALUES
(1, 1, '{"points": [[10, 20], [15, 25], [20, 30]], "color": "#FF0000", "width": 3, "tool": "pen"}', NOW() - INTERVAL '30 minutes'),
(1, 2, '{"points": [[50, 60], [55, 65]], "color": "#0000FF", "width": 5, "tool": "pen"}', NOW() - INTERVAL '25 minutes'),
(1, 3, '{"text": "Hello!", "x": 100, "y": 100, "color": "#000000", "tool": "text"}', NOW() - INTERVAL '20 minutes');

-- 12. Chatrooms and Messages

-- Chatrooms (smaller user_id is user1_id)
INSERT INTO chatrooms (user1_id, user2_id, last_message, last_message_at, created_at) VALUES
(1, 2, 'Got it!', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '1 day'),
(1, 4, 'Thank you!', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '2 days'),
(2, 3, 'Haha that is funny', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '3 days');

-- Messages
INSERT INTO messages (chatroom_id, sender_id, content, is_read, read_at, created_at) VALUES
-- Chatroom 1 (user1: 1, user2: 2)
(1, 1, 'Hello! I saw your post', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
(1, 2, 'Hi! What can I help you with?', TRUE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '23 hours'),
(1, 1, 'You draw really well on the canvas', TRUE, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '20 minutes'),
(1, 2, 'Thank you! I draw as a hobby', TRUE, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),
(1, 1, 'Can you give me some tips?', TRUE, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes'),
(1, 2, 'Got it!', TRUE, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),

-- Chatroom 2 (user1: 1, user2: 4)
(2, 1, 'How is school life?', TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(2, 4, 'It is fun! Friends are nice', TRUE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 23 hours'),
(2, 1, 'Nice! Is studying hard?', TRUE, NOW() - INTERVAL '6 minutes', NOW() - INTERVAL '6 minutes'),
(2, 4, 'A bit difficult but working hard', TRUE, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes'),
(2, 1, 'Thank you!', FALSE, NULL, NOW() - INTERVAL '5 minutes');

-- 13. Activity Logs (Sample)
INSERT INTO activity_logs (user_id, activity_type, target_type, target_id, metadata, created_at) VALUES
(1, 'post_create', 'post', 1, '{"location": "Seoul", "device": "iOS"}', NOW() - INTERVAL '2 hours'),
(2, 'comment_create', 'comment', 1, '{"post_id": 1}', NOW() - INTERVAL '1 hour 30 minutes'),
(3, 'post_like', 'post', 1, '{}', NOW() - INTERVAL '1 hour'),
(4, 'login', NULL, NULL, '{"device": "Android"}', NOW() - INTERVAL '5 hours');

-- 14. Update Statistics

-- Update student count per school (trigger handles this automatically, but checking)
UPDATE schools SET 
    total_students = (SELECT COUNT(*) FROM users WHERE school_id = schools.school_id AND is_student = TRUE);

-- Update post count per place
UPDATE places SET 
    post_count = (SELECT COUNT(*) FROM posts WHERE place_id = places.place_id);

-- Update hashtag use count
UPDATE hashtags SET 
    use_count = (SELECT COUNT(*) FROM post_hashtags WHERE hashtag_id = hashtags.hashtag_id);

-- Verify data
SELECT 'User count:' as info, COUNT(*) as count FROM users
UNION ALL
SELECT 'Regular users:', COUNT(*) FROM users WHERE is_student = FALSE
UNION ALL
SELECT 'Students:', COUNT(*) FROM users WHERE is_student = TRUE
UNION ALL
SELECT 'Total posts:', COUNT(*) FROM posts
UNION ALL
SELECT 'Doodle posts:', COUNT(*) FROM posts WHERE board_type = 'doodle'
UNION ALL
SELECT 'School posts:', COUNT(*) FROM posts WHERE board_type IN ('free', 'tell', 'ourschool')
UNION ALL
SELECT 'Total comments:', COUNT(*) FROM comments
UNION ALL
SELECT 'Total likes:', COUNT(*) FROM post_likes;

-- School statistics
SELECT 
    s.name as school_name,
    s.total_students,
    COUNT(p.post_id) as post_count
FROM schools s
LEFT JOIN posts p ON s.school_id = p.school_id
GROUP BY s.school_id, s.name, s.total_students
ORDER BY s.school_id;

SELECT 'Seed data insertion complete!' as result;
