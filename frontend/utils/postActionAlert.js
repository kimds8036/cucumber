/** 사후 확인(완료·접수 등) Alert — 단일 확인 버튼, 실행 전 취소/삭제 확인은 제외 */
const POST_ACTION_TITLES = new Set([
  '완료',
  '삭제됨',
  '저장 완료',
  '신고 접수',
  '접수 완료',
  '세션 만료',
  '계정 탈퇴',
  '비밀번호 변경',
]);

export function isPostActionConfirmAlert(payload) {
  if (!payload) return false;

  const options = payload.options || {};
  if (options.dismissOnBackdrop === false) return true;
  if (options.dismissOnBackdrop === true) return false;

  const buttons =
    Array.isArray(payload.buttons) && payload.buttons.length > 0
      ? payload.buttons
      : [{ text: '확인' }];

  if (buttons.length !== 1) return false;

  const title = String(payload.title ?? '').trim();
  return POST_ACTION_TITLES.has(title);
}
