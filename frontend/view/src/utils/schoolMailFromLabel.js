/**
 * 학교 우편 발신자 표시
 * 우편함 schoolId(또는 mail.school_id)와 작성자 학교가 같으면 "재학생", 아니면 "OO 학교명 학생"
 */
export function getSchoolMailFromLabel(mail, mailboxSchoolId) {
  if (!mail) return '학생';
  const box =
    mailboxSchoolId != null && mailboxSchoolId !== ''
      ? String(mailboxSchoolId)
      : String(mail.school_id ?? '');
  const author = mail.author_school_id != null && mail.author_school_id !== ''
    ? String(mail.author_school_id)
    : '';
  if (box && author && author === box) return '재학생';
  const name = (mail.author_school_name || '').trim();
  return name ? `${name} 학생` : '학생';
}
