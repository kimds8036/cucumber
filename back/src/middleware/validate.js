import { validationResult } from 'express-validator';

/**
 * express-validator 체이너 배열을 받아 검증을 실행하고,
 * 실패 시 422 응답으로 통일한다. 통과 시 next() 호출.
 *
 * 응답 포맷 (성공 0개 / 실패 시):
 *   {
 *     success: false,
 *     code: 'VALIDATION_ERROR',
 *     message: '<첫 번째 에러 메시지>',
 *     errors: [...]
 *   }
 *
 * 핵심 설계:
 *  - 422(Unprocessable Entity) 로 통일 → 인증 실패(401), 권한(403), 비즈니스 충돌(400, 409) 과 분리
 *  - 첫 에러 메시지를 message 로 노출해 프론트가 그대로 토스트할 수 있게 함
 *  - 기존 라우트 안의 ad-hoc 체크는 그대로 두고 그 앞단의 게이트로만 동작
 */
export const validate = (chains) => async (req, res, next) => {
  try {
    if (Array.isArray(chains) && chains.length > 0) {
      for (const chain of chains) {
        // express-validator chain 은 thenable, 순차 실행
        // eslint-disable-next-line no-await-in-loop
        await chain.run(req);
      }
    }
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const list = errors.array({ onlyFirstError: true });
    const first = list[0];
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: first?.msg || '입력값이 올바르지 않습니다.',
      errors: list,
    });
  } catch (err) {
    return next(err);
  }
};

export default validate;
