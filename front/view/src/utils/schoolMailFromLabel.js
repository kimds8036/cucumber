/**
 * 학교 우편 발신자 표시
 * 스냅샷 author_school_id + 현재 author_current_school_id 로 재학생/졸업생 분기
 */
export function getSchoolMailFromLabel(mail, mailboxSchoolId) {
  if (!mail) return '학생';
  const box =
    mailboxSchoolId != null && mailboxSchoolId !== ''
      ? String(mailboxSchoolId)
      : String(mail.school_id ?? '');
  const snapshot =
    mail.author_school_id != null && mail.author_school_id !== ''
      ? String(mail.author_school_id)
      : '';
  const current =
    mail.author_current_school_id != null && mail.author_current_school_id !== ''
      ? String(mail.author_current_school_id)
      : snapshot;

  if (box && snapshot && snapshot === box) {
    if (current && current === box) return '재학생';
    const name = (mail.author_school_name || '').trim();
    return name ? `졸업생 · ${name} 졸업생` : '졸업생';
  }

  const name = (mail.author_school_name || '').trim();
  return name ? name : '학생';
}

/**
 * 학교 우편 댓글 작성자 표시
 */
export function getSchoolMailCommentAuthorLabel(
  comment,
  mailboxSchoolId,
  mailAuthorUserId,
) {
  if (!comment) return '학생';
  const commentUserId =
    comment.user_id != null && comment.user_id !== ''
      ? Number(comment.user_id)
      : null;
  const mailUid =
    mailAuthorUserId != null && mailAuthorUserId !== ''
      ? Number(mailAuthorUserId)
      : null;
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
      author_current_school_id: comment.author_current_school_id,
      author_school_name: comment.author_school_name,
      school_id: mailboxSchoolId,
    },
    mailboxSchoolId,
  );
}
