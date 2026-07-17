import pool from '../config/database.js';
import { getAdminBasePath } from '../config/adminPath.js';

/** @typedef {'review' | 'inquiry' | 'report'} DiscordChannel */

const EMBED_COLOR = {
  review: 0x3b82f6,
  inquiry: 0x22c55e,
  report: 0xf59e0b,
  autoHide: 0xef4444,
  appeal: 0x8b5cf6,
};

const PURPOSE_LABEL = {
  signup: '가입',
  resubmit: '재제출',
  reverification: '재인증',
};

function isDiscordWebhookEnabled() {
  return String(process.env.DISCORD_WEBHOOK_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

/**
 * @param {DiscordChannel} channel
 * @returns {string}
 */
function resolveWebhookUrl(channel) {
  const byChannel = {
    review: process.env.DISCORD_WEBHOOK_URL_REVIEW,
    inquiry: process.env.DISCORD_WEBHOOK_URL_INQUIRY,
    report: process.env.DISCORD_WEBHOOK_URL_REPORT,
  };
  return String(
    byChannel[channel] || process.env.DISCORD_WEBHOOK_URL || '',
  ).trim();
}

function getPublicApiBaseUrl() {
  return String(
    process.env.PUBLIC_API_BASE_URL ||
      process.env.INICIS_PUBLIC_BASE_URL ||
      '',
  )
    .trim()
    .replace(/\/+$/, '');
}

/** 관리자 SPA 패널 안내 링크 (해시 라우팅 미지원 — 베이스 + 패널명 힌트) */
function adminPanelHint(panel) {
  const base = getPublicApiBaseUrl();
  const adminPath = getAdminBasePath();
  if (!base) return `관리자 → ${panel}`;
  return `${base}${adminPath} (패널: ${panel})`;
}

function truncate(text, max = 200) {
  const s = String(text ?? '').trim();
  if (!s) return '-';
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function field(name, value, inline = true) {
  return {
    name,
    value: String(value ?? '-').slice(0, 1024) || '-',
    inline,
  };
}

function isoNow(date) {
  try {
    return (date instanceof Date ? date : new Date(date || Date.now())).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Discord Embed POST (best-effort). 실패해도 throw 하지 않음.
 * @param {{ channel: DiscordChannel, embeds: object[], content?: string }} opts
 */
export async function sendDiscordWebhook({ channel, embeds, content }) {
  if (!isDiscordWebhookEnabled()) return { skipped: true, reason: 'disabled' };

  const webhookUrl = resolveWebhookUrl(channel);
  if (!webhookUrl) return { skipped: true, reason: 'no_url' };

  try {
    const payload = {
      embeds: Array.isArray(embeds) ? embeds.slice(0, 10) : [],
    };
    if (content) payload.content = String(content).slice(0, 2000);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error(
        `[DiscordWebhook] 실패 channel=${channel} status=${response.status} body=${bodyText.slice(0, 200)}`,
      );
      return { ok: false, status: response.status };
    }
    return { ok: true };
  } catch (error) {
    console.error(
      `[DiscordWebhook] 예외 channel=${channel} error=${error?.message || error}`,
    );
    return { ok: false, error: error?.message };
  }
}

/** fire-and-forget — 호출부 API 성공과 무관 */
function enqueue(channel, build) {
  Promise.resolve()
    .then(() => build())
    .then((payload) => {
      if (!payload) return;
      return sendDiscordWebhook({ channel, ...payload });
    })
    .catch((error) => {
      console.error(
        `[DiscordWebhook] enqueue 실패 channel=${channel} error=${error?.message || error}`,
      );
    });
}

async function lookupSchoolName(schoolId) {
  const id = String(schoolId || '').trim();
  if (!id || id === 'CERT_PENDING') return null;
  try {
    const [rows] = await pool.execute(
      'SELECT name FROM schools WHERE school_id = ? LIMIT 1',
      [id],
    );
    return rows[0]?.name || null;
  } catch {
    return null;
  }
}

function purposeLabel(purpose) {
  return PURPOSE_LABEL[purpose] || purpose || '가입';
}

/**
 * 학생증 검수 대기
 * @param {{
 *   userId: number,
 *   username?: string,
 *   schoolId?: string,
 *   schoolName?: string,
 *   purpose?: string,
 *   submissionId?: number,
 *   cloudinaryUrl?: string,
 *   submittedAt?: Date|string,
 * }} p
 */
export function notifyStudentIdReviewPending(p) {
  enqueue('review', async () => {
    const schoolName =
      p.schoolName || (await lookupSchoolName(p.schoolId)) || p.schoolId || '-';
    const embed = {
      title: '🪪 학생증 검수 대기',
      color: EMBED_COLOR.review,
      fields: [
        field('유저', `${p.username || '-'} (#${p.userId})`),
        field('학교', schoolName),
        field('목적', purposeLabel(p.purpose)),
        field('제출 ID', p.submissionId != null ? `#${p.submissionId}` : '-'),
        field('관리자', adminPanelHint('student-ids'), false),
      ],
      timestamp: isoNow(p.submittedAt),
    };
    if (p.cloudinaryUrl) {
      embed.image = { url: p.cloudinaryUrl };
    }
    return { embeds: [embed] };
  });
}

/**
 * 재학증명서 검수 대기 — 열람번호는 절대 포함하지 않음
 * @param {{
 *   userId: number,
 *   username?: string,
 *   claimedSchoolName?: string,
 *   submissionId?: number,
 *   certificateViewUrl?: string,
 *   submittedAt?: Date|string,
 * }} p
 */
export function notifyCertificateReviewPending(p) {
  enqueue('review', async () => {
    let viewHint = '(관리자 페이지에서 확인)';
    const raw = String(p.certificateViewUrl || '').trim();
    if (raw) {
      try {
        const u = new URL(raw);
        viewHint = `${u.hostname}${u.pathname.length > 40 ? `${u.pathname.slice(0, 40)}…` : u.pathname}`;
      } catch {
        viewHint = truncate(raw, 60);
      }
    }
    return {
      embeds: [
        {
          title: '📄 재학증명서 검수 대기',
          color: EMBED_COLOR.review,
          fields: [
            field('유저', `${p.username || '-'} (#${p.userId})`),
            field('주장 학교', p.claimedSchoolName || '-'),
            field('제출 ID', p.submissionId != null ? `#${p.submissionId}` : '-'),
            field('열람 URL', viewHint, false),
            field('관리자', adminPanelHint('certificates'), false),
          ],
          timestamp: isoNow(p.submittedAt),
        },
      ],
    };
  });
}

/**
 * 문의 등록
 * @param {{
 *   inquiryId: number,
 *   contactUsername?: string,
 *   contactEmail?: string,
 *   content?: string,
 *   imageCount?: number,
 *   userId?: number|null,
 *   createdAt?: Date|string,
 * }} p
 */
export function notifyInquiryCreated(p) {
  enqueue('inquiry', async () => ({
    embeds: [
      {
        title: '💬 문의 등록',
        color: EMBED_COLOR.inquiry,
        fields: [
          field('문의 ID', `#${p.inquiryId}`),
          field('아이디', p.contactUsername || '-'),
          field('이메일', p.contactEmail || '-'),
          field('첨부', `${Number(p.imageCount) || 0}장`),
          field(
            '유저',
            p.userId != null ? `#${p.userId}` : '비로그인',
          ),
          field('본문', truncate(p.content, 200), false),
          field('관리자', adminPanelHint('inquiries'), false),
        ],
        timestamp: isoNow(p.createdAt),
      },
    ],
  }));
}

/**
 * 신고 접수
 * @param {{
 *   reportId?: number,
 *   targetType: string,
 *   targetId: number|string,
 *   reason?: string,
 *   description?: string,
 *   reporterId?: number,
 *   reportedUserId?: number|null,
 *   createdAt?: Date|string,
 * }} p
 */
export function notifyReportCreated(p) {
  enqueue('report', async () => ({
    embeds: [
      {
        title: '🚩 신고 접수',
        color: EMBED_COLOR.report,
        fields: [
          field('신고 ID', p.reportId != null ? `#${p.reportId}` : '-'),
          field('유형', p.targetType || '-'),
          field('대상 ID', `#${p.targetId}`),
          field('사유', p.reason || '-'),
          field('피신고자', p.reportedUserId != null ? `#${p.reportedUserId}` : '-'),
          field('신고자', p.reporterId != null ? `#${p.reporterId}` : '-'),
          field('상세', truncate(p.description, 200), false),
          field('관리자', adminPanelHint('reports'), false),
        ],
        timestamp: isoNow(p.createdAt),
      },
    ],
  }));
}

/**
 * 게시글 자동 숨김 (신고 임계) — 멘션 가능
 * @param {{ postId: number|string, reportCount: number, hiddenAt?: Date|string }} p
 */
export function notifyPostAutoHidden(p) {
  enqueue('report', async () => {
    const mention = String(process.env.DISCORD_WEBHOOK_MENTION || '').trim();
    return {
      content: mention || undefined,
      embeds: [
        {
          title: '⚠️ 게시글 자동 숨김',
          color: EMBED_COLOR.autoHide,
          fields: [
            field('게시글 ID', `#${p.postId}`),
            field('신고 건수', String(p.reportCount)),
            field('관리자', adminPanelHint('reports'), false),
          ],
          timestamp: isoNow(p.hiddenAt),
        },
      ],
    };
  });
}

/**
 * 이의신청
 * @param {{
 *   appealId?: number,
 *   postId: number|string,
 *   appellantId?: number,
 *   content?: string,
 *   createdAt?: Date|string,
 * }} p
 */
export function notifyAppealCreated(p) {
  enqueue('report', async () => ({
    embeds: [
      {
        title: '📝 이의신청 접수',
        color: EMBED_COLOR.appeal,
        fields: [
          field('이의 ID', p.appealId != null ? `#${p.appealId}` : '-'),
          field('게시글 ID', `#${p.postId}`),
          field('신청자', p.appellantId != null ? `#${p.appellantId}` : '-'),
          field('내용', truncate(p.content, 200), false),
          field('관리자', adminPanelHint('appeals'), false),
        ],
        timestamp: isoNow(p.createdAt),
      },
    ],
  }));
}
