/**
 * 학교 우편 발신자 표시
 * 우편함 schoolId(또는 mail.school_id)와 작성자 학교가 같으면 "재학생", 아니면 "OO 학교명"
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
  return name ? name : '학생';
}

/**
 * 학교 우편 댓글 작성자 표시
 * - 원글 작성자 → "작성자"
 * - 우편함 학교와 동일 학교 → "재학생"
 * - 그 외 → 타학교명 (getSchoolMailFromLabel 과 동일)
 */
export function getSchoolMailCommentAuthorLabel(comment, mailboxSchoolId, mailAuthorUserId) {
  if (!comment) return '학생';
  const commentUserId =
    comment.user_id != null && comment.user_id !== '' ? Number(comment.user_id) : null;
  const mailUid =
    mailAuthorUserId != null && mailAuthorUserId !== '' ? Number(mailAuthorUserId) : null;
  if (
    commentUserId != null &&
    mailUid != null &&
    Number.isFinite(commentUserId) &&
    Number.isFinite(mailUid) &&
    commentUserId === mailUid
  ) {
    return '작성자';
  }
  return getSchoolMailFromLabel(
    {
      author_school_id: comment.author_school_id,
      author_school_name: comment.author_school_name,
      school_id: mailboxSchoolId,
    },
    mailboxSchoolId,
  );
}
