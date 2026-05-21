import {
  sendPersonalMailByAddress,
  getPersonalMailRetryPayload,
} from '../services/personalMail.service.js';
import { PERSONAL_MAIL_DUPLICATE_CODE } from '../constants/personalMail.js';

/**
 * POST /api/mails/personal/send
 * GET  /api/mails/personal/:mailId/retry
 */
export function registerPersonalMailSendRoutes(router, authenticate) {
  router.post('/personal/send', authenticate, async (req, res) => {
    try {
      const result = await sendPersonalMailByAddress(req.user.userId, req.body);

      if (result.duplicate) {
        return res.status(409).json({
          success: false,
          status: result.status,
          code: result.code || PERSONAL_MAIL_DUPLICATE_CODE,
          message: result.message,
        });
      }

      return res.status(201).json(result);
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('개인 우편 send 오류:', error);
      return res.status(status).json({
        success: false,
        message: error.message || '우편 전송 중 오류가 발생했습니다.',
      });
    }
  });

  router.get('/personal/:mailId/retry', authenticate, async (req, res) => {
    try {
      const mailId = parseInt(req.params.mailId, 10);
      const data = await getPersonalMailRetryPayload(mailId, req.user.userId);
      return res.json({ success: true, data });
    } catch (error) {
      const status = error.status || 500;
      if (status >= 500) console.error('개인 우편 retry 오류:', error);
      return res.status(status).json({
        success: false,
        message: error.message || '조회 중 오류가 발생했습니다.',
      });
    }
  });
}
