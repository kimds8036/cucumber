import express from 'express';
import { isVersionBelow } from '../utils/semver.js';
import { resolveStoreUrl } from '../utils/storeUrls.js';

const router = express.Router();

/**
 * GET /api/app/version-check?platform=android|ios&version=1.1.0
 * 인증 없음 — 앱 실행 직후 강제 업데이트 여부 확인
 */
router.get('/version-check', (req, res) => {
  const platform = String(req.query.platform || 'android').trim().toLowerCase();
  const clientVersion = String(req.query.version || '').trim();

  const minVersion =
    platform === 'ios'
      ? (process.env.MIN_IOS_VERSION || process.env.MIN_APP_VERSION || '1.0.0')
      : (process.env.MIN_ANDROID_VERSION || process.env.MIN_APP_VERSION || '1.0.0');

  const storeUrl = resolveStoreUrl(platform);

  const forceUpdate =
    clientVersion.length > 0 && isVersionBelow(clientVersion, minVersion);

  return res.json({
    success: true,
    data: {
      forceUpdate,
      minVersion,
      storeUrl,
      clientVersion,
      platform,
    },
  });
});

/**
 * POST /api/app/install-open
 * 인증 없음 — 로그인 전 첫 실행·재실행 (미가입 퍼널)
 */
router.post('/install-open', async (req, res) => {
  try {
    const { recordAppInstallOpen } = await import('../services/appPresence.service.js');
    const data = await recordAppInstallOpen({
      installId: req.body?.installId ?? req.body?.install_id,
      deviceId: req.body?.deviceId ?? req.body?.device_id,
      platform: req.body?.platform,
      appVersion: req.body?.appVersion ?? req.body?.app_version,
    });
    return res.json({ success: true, data });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        success: false,
        message: error.message || '요청이 올바르지 않습니다.',
      });
    }
    console.error('install-open 오류:', error);
    return res.status(500).json({
      success: false,
      message: '설치 기록 중 오류가 발생했습니다.',
    });
  }
});

export default router;
