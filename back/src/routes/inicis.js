import express from 'express';
import {
  createInicisSessionWithCallbackQuery,
  getInicisSessionStatus,
  getLaunchFormWithCallbackQuery,
  handleInicisCallback,
  isInicisEnabled,
  renderAutoPostHtml,
} from '../services/inicis.service.js';

const router = express.Router();

function pickBody(req) {
  // form-urlencoded / json / query
  return { ...req.query, ...req.body };
}

/** POST /api/auth/inicis/session  { purpose: student_signup|guardian_consent } */
router.post('/session', async (req, res) => {
  try {
    if (!isInicisEnabled()) {
      return res.status(503).json({
        success: false,
        code: 'INICIS_DISABLED',
        message:
          '이니시스 실연동이 비활성화되어 있습니다. (INICIS_ENABLED=false)',
      });
    }
    const purpose = String(req.body?.purpose || 'student_signup').trim();
    const data = await createInicisSessionWithCallbackQuery({ purpose });
    return res.json({
      success: true,
      data: {
        mTxId: data.mTxId,
        launchUrl: data.launchUrl,
        expiresAt: data.expiresAt,
        pollPath: `/api/auth/inicis/session/${encodeURIComponent(data.mTxId)}`,
      },
    });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      success: false,
      code: e.code || undefined,
      message: e.message || '세션 생성 실패',
    });
  }
});

/** GET /api/auth/inicis/launch/:mTxId — 브라우저/앱이 열어 자동 POST */
router.get('/launch/:mTxId', async (req, res) => {
  try {
    const launch = await getLaunchFormWithCallbackQuery(
      String(req.params.mTxId || '').trim(),
    );
    const html = renderAutoPostHtml(launch);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    const status = e.status || 500;
    res.status(status);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;text-align:center;">
      <h3>인증 시작 실패</h3><p>${String(e.message || '')}</p></body></html>`,
    );
  }
});

async function callbackHandler(req, res, { fail }) {
  try {
    const body = pickBody(req);
    const result = await handleInicisCallback(body, { fail });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(result.html);
  } catch (e) {
    console.error('[inicis callback]', e);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;text-align:center;">
      <h3>처리 오류</h3><p>잠시 후 앱에서 다시 시도해 주세요.</p></body></html>`,
    );
  }
}

router.all('/callback/success', (req, res) =>
  callbackHandler(req, res, { fail: false }),
);
router.all('/callback/fail', (req, res) =>
  callbackHandler(req, res, { fail: true }),
);

/** GET /api/auth/inicis/session/:mTxId */
router.get('/session/:mTxId', async (req, res) => {
  try {
    const data = await getInicisSessionStatus(
      String(req.params.mTxId || '').trim(),
    );
    return res.json({ success: true, data });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({
      success: false,
      message: e.message || '조회 실패',
    });
  }
});

/** GET /api/auth/inicis/status — enabled 여부만 (앱이 mock 분기할 때) */
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: { enabled: isInicisEnabled() },
  });
});

export default router;
