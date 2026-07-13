-- 앱 복귀 딥링크 (expo-web-browser openAuthSessionAsync)
ALTER TABLE identity_verifications
  ADD COLUMN app_return_url VARCHAR(512) NULL
    COMMENT '앱 복귀 URL (youthpaper://inicis/return 등)'
  AFTER purpose;
