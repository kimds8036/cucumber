-- 019: 마이페이지 프로필 사진
ALTER TABLE users
  ADD COLUMN avatar_url VARCHAR(512) NULL COMMENT '프로필 사진 Cloudinary URL' AFTER color_id,
  ADD COLUMN avatar_public_id VARCHAR(255) NULL COMMENT '프로필 사진 Cloudinary public_id' AFTER avatar_url;
