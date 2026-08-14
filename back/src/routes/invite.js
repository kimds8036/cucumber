import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  ensureUserInviteCode,
  buildInviteLandingPath,
  countSuccessfulInvites,
} from '../services/invite.service.js';
import { INVITE_BADGE_THRESHOLD } from '../constants/badges.js';

const router = express.Router();

function publicApiBase(req) {
  const fromEnv = String(process.env.PUBLIC_API_BASE_URL || '').trim().replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  if (host) return `${proto}://${host}`.replace(/\/+$/, '');
  return 'https://cucumber-develop.up.railway.app';
}

router.get('/me', authenticate, async (req, res) => {
  try {
    const code = await ensureUserInviteCode(req.user.userId);
    const count = await countSuccessfulInvites(req.user.userId);
    const base = publicApiBase(req);
    const landingUrl = `${base}${buildInviteLandingPath(code)}`;
    return res.json({
      success: true,
      data: {
        inviteCode: code,
        landingUrl,
        deepLink: `youthpaper://invite?ref=${encodeURIComponent(code)}`,
        successfulInvites: count,
        targetInvites: INVITE_BADGE_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('[invite] me', error);
    return res.status(500).json({
      success: false,
      message: '초대 링크를 만들지 못했습니다.',
    });
  }
});

export default router;
