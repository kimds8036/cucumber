import multer from 'multer';

/**
 * multer 파일 크기/개수/형식 오류 → 422 통일
 */
export function multerErrorHandler(err, req, res, next) {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        success: false,
        code: 'LIMIT_FILE_SIZE',
        message: '파일 크기가 허용 한도를 초과했습니다.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(422).json({
        success: false,
        code: err.code,
        message: '업로드할 수 있는 파일 개수 또는 형식이 올바르지 않습니다.',
      });
    }
    return res.status(422).json({
      success: false,
      code: err.code || 'MULTER_ERROR',
      message: '파일 업로드에 실패했습니다.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(422).json({
      success: false,
      code: 'LIMIT_UNEXPECTED_FILE',
      message: err.message || '허용되지 않는 파일 형식입니다.',
    });
  }

  return next(err);
}

export default multerErrorHandler;
