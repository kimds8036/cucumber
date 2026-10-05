/** 앱 API용 Dry-Run 플래그. 운영에서는 공개 라우트가 403으로 거절한다. */

export function isDryRunRequested(req) {
  const header = String(req.get('X-Dry-Run') || '').trim().toLowerCase();
  const query = String(req.query?.dryRun || '').trim().toLowerCase();
  return header === 'true' || header === '1' || query === 'true' || query === '1';
}

export function attachDryRun(req, res, next) {
  if (!isDryRunRequested(req)) {
    req.dryRun = false;
    return next();
  }
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message:
        '운영 API에서는 Dry-Run을 지원하지 않습니다. 관리자 기능 테스트 메뉴를 사용하세요.',
    });
  }
  const contentType = String(req.get('content-type') || '');
  if (contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: 'Dry-Run은 파일 업로드를 지원하지 않습니다.',
    });
  }
  req.dryRun = true;
  return next();
}
