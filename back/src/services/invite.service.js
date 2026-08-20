import crypto from 'crypto';
import pool from '../config/database.js';
import { sanitizeInviteCode } from '../constants/badges.js';

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomInviteCode(len = 8) {
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export async function ensureUserInviteCode(userId) {
  const [[row]] = await pool.execute(
    `SELECT invite_code FROM users WHERE id = ? AND is_deleted = FALSE LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  if (row.invite_code) return String(row.invite_code);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = randomInviteCode(8);
    try {
      const [result] = await pool.execute(
        `UPDATE users SET invite_code = ? WHERE id = ? AND invite_code IS NULL`,
        [code, userId],
      );
      if (result.affectedRows > 0) return code;
      const [[again]] = await pool.execute(
        `SELECT invite_code FROM users WHERE id = ? LIMIT 1`,
        [userId],
      );
      if (again?.invite_code) return String(again.invite_code);
    } catch (err) {
      if (err?.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  throw new Error('invite_code_alloc_failed');
}

export function buildInviteLandingPath(code) {
  return `/get?ref=${encodeURIComponent(code)}`;
}

export async function applySignupInvite({ inviteeId, rawCode }) {
  const code = sanitizeInviteCode(rawCode);
  if (!code || !inviteeId) return { applied: false };

  const [[inviter]] = await pool.execute(
    `SELECT id FROM users WHERE invite_code = ? AND is_deleted = FALSE LIMIT 1`,
    [code],
  );
  if (!inviter || Number(inviter.id) === Number(inviteeId)) {
    return { applied: false };
  }

  try {
    await pool.execute(
      `INSERT INTO user_invites (inviter_id, invitee_id) VALUES (?, ?)`,
      [inviter.id, inviteeId],
    );
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY') return { applied: false };
    throw err;
  }

  import('./badge.service.js')
    .then((m) => m.evaluateAndUnlockBadges(inviter.id))
    .catch((e) => {
      console.warn('[invite] badge eval', e?.message || e);
    });
  return { applied: true, inviterId: inviter.id };
}

export async function countSuccessfulInvites(userId) {
  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS c FROM user_invites WHERE inviter_id = ?`,
    [userId],
  );
  return Number(row?.c || 0);
}
