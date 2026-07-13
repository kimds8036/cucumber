-- 게시글 작성 시점 위치 (선택). 거리 표시·근처 탭 필터에 사용.
ALTER TABLE posts
  ADD COLUMN latitude DECIMAL(10,7) NULL COMMENT '작성 시점 위도' AFTER content,
  ADD COLUMN longitude DECIMAL(10,7) NULL COMMENT '작성 시점 경도' AFTER latitude;
