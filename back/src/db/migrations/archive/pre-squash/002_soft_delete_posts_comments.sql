-- 게시글·댓글 소프트 삭제 (상태값만 변경, 1년 후 폐기 예정)
ALTER TABLE posts ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부';
ALTER TABLE comments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE COMMENT '삭제 여부';
