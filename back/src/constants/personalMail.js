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

/** 반송까지 대기 (시간) — PERSONAL_MAIL_RETURN_HOURS 로 덮어쓰기 */
export const DEFAULT_PERSONAL_MAIL_RETURN_HOURS = 3;

/** 테스트 모드(USE_TEST_MAIL_RETURN) 기본 대기 (분) — 3시간 */
export const DEFAULT_PERSONAL_MAIL_TEST_RETURN_MINUTES = 180;
