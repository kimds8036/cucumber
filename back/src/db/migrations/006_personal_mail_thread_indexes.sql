ALTER TABLE personal_mails
  ADD INDEX idx_personal_mails_root_mail_id (root_mail_id),
  ADD INDEX idx_personal_mails_parent_mail_id (parent_mail_id);
