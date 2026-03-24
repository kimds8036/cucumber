ALTER TABLE personal_mails
  ADD COLUMN parent_mail_id INT NULL DEFAULT NULL,
  ADD COLUMN root_mail_id INT NULL DEFAULT NULL;

ALTER TABLE personal_mails
  ADD FOREIGN KEY (parent_mail_id) REFERENCES personal_mails(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (root_mail_id) REFERENCES personal_mails(id) ON DELETE SET NULL;
