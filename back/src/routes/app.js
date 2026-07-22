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

export default router;
