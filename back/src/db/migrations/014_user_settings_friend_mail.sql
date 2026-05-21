ALTER TABLE user_settings
  ADD COLUMN friend_request BOOLEAN DEFAULT TRUE COMMENT '친구 요청 알림',
  ADD COLUMN mail_outgoing BOOLEAN DEFAULT TRUE COMMENT '우편 발신 알림';
