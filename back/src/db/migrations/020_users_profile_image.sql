-- 020: 마이페이지 프로필 사진 1장
ALTER TABLE `users`
  ADD COLUMN `profile_image_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '프로필 사진 Cloudinary URL' AFTER `color_id`,
  ADD COLUMN `profile_image_public_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '프로필 사진 Cloudinary public_id' AFTER `profile_image_url`;
