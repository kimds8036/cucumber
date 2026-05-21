/** personal_mails.status */
export const PERSONAL_MAIL_STATUS = Object.freeze({
  SENT: 'sent',
  READ: 'read',
  RETURNED: 'returned',
});

/** 프론트 sendmailscreen.jsx 와 동일 */
export const PERSONAL_MAIL_DUPLICATE_CODE = 'DUPLICATE_RECIPIENT';

export const PERSONAL_MAIL_RETURN_RELATED_TYPE = 'personal_mail_returned';
export const PERSONAL_MAIL_RETURN_NOTIFICATION_TYPE = 'mail_returned';

/** 반송까지 대기 (일) — 환경 변수 PERSONAL_MAIL_RETURN_DAYS 로 덮어쓰기 */
export const DEFAULT_PERSONAL_MAIL_RETURN_DAYS = 1;
