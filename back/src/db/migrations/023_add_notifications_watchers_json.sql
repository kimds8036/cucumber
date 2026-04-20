ALTER TABLE notifications
ADD COLUMN watchers_json JSON NULL COMMENT 'study summary 대기자 목록(JSON)';
