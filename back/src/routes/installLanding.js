import express from 'express';
import { recordInstallLandingVisit } from '../services/installLandingStats.service.js';
import { resolveStoreUrl } from '../utils/storeUrls.js';
import { sanitizeInviteCode } from '../constants/badges.js';

const router = express.Router();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 링크 미리보기 크롤러만 봇 처리.
 * 인스타 인앱 WebView(UA에 Instagram 포함)는 실제 사용자.
 */
function isLinkPreviewCrawler(ua) {
  return /facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Discordbot|KakaoTalk-Scrap/i.test(
    ua,
  );
}

/** @returns {'ios'|'android'|'other'} */
function detectMobilePlatform(ua) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

function resolveGoogleAdsTagId() {
  const raw = String(
    process.env.GOOGLE_ADS_TAG_ID ||
      process.env.GTAG_AW_ID ||
      'AW-18343935989',
  ).trim();
  // AW-숫자만 허용
  if (!/^AW-\d+$/i.test(raw)) return '';
  return raw.toUpperCase();
}

function withAndroidInviteReferrer(androidUrl, inviteCode) {
  if (!inviteCode) return androidUrl;
  try {
    const u = new URL(androidUrl);
    const extra = `utm_source=invite&utm_medium=share&utm_content=${encodeURIComponent(inviteCode)}`;
    const existing = u.searchParams.get('referrer');
    u.searchParams.set('referrer', existing ? `${existing}&${extra}` : extra);
    return u.toString();
  } catch {
    return androidUrl;
  }
}

function buildLandingHtml({
  androidUrl,
  iosUrl,
  autoRedirectUrl,
  platform,
  inviteDeepLink,
}) {
  const title = String(
    process.env.INSTALL_LANDING_TITLE || 'Youth Paper',
  ).trim();
  const description = String(
    process.env.INSTALL_LANDING_DESCRIPTION ||
      '학교 인증 학생 커뮤니티 — 시간표·급식·게시판·공부 타이머',
  ).trim();
  const ogImage = String(process.env.INSTALL_LANDING_OG_IMAGE || '').trim();
  const googleAdsTagId = resolveGoogleAdsTagId();

  const gtagBlock = googleAdsTagId
    ? `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(googleAdsTagId)}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAdsTagId)});
</script>`
    : '';

  // 모바일 자동 리다이렉트: 초대 딥링크 우선, 없으면 스토어
  const redirectBlock = autoRedirectUrl
    ? `<script>
(function () {
  var storeUrl = ${JSON.stringify(autoRedirectUrl)};
  var appUrl = ${JSON.stringify(inviteDeepLink || '')};
  if (!storeUrl && !appUrl) return;
  var gone = false;
  function goStore() {
    if (gone) return;
    gone = true;
    if (storeUrl) window.location.replace(storeUrl);
  }
  function goAppThenStore() {
    if (appUrl) {
      window.location.href = appUrl;
      setTimeout(goStore, 1400);
      return;
    }
    goStore();
  }
  var fallbackMs = ${googleAdsTagId ? 1800 : 0};
  if (fallbackMs <= 0) {
    goAppThenStore();
    return;
  }
  setTimeout(goAppThenStore, fallbackMs);
  function trySendThenGo() {
    if (typeof gtag !== 'function') return;
    try {
      gtag('event', 'page_view', {
        send_to: ${JSON.stringify(googleAdsTagId)},
        event_callback: goAppThenStore,
        event_timeout: 1500
      });
    } catch (e) {
      goAppThenStore();
    }
  }
  if (document.readyState === 'complete') {
    trySendThenGo();
  } else {
    window.addEventListener('load', trySendThenGo);
  }
})();
</script>
<noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(autoRedirectUrl)}" /></noscript>`
    : '';

  const ogImageTag = ogImage
    ? `<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`
    : `<meta name="twitter:card" content="summary" />`;

  const hint =
    platform === 'ios'
      ? 'App Store로 이동합니다…'
      : platform === 'android'
        ? 'Play 스토어로 이동합니다…'
        : '설치할 스토어를 선택해 주세요.';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${gtagBlock}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:site_name" content="Youth Paper" />
  ${ogImageTag}
  <style>
    :root {
      --bg: #E5F4E0;
      --card: #ffffff;
      --text: #272A26;
      --muted: #6B7280;
      --primary: #6f9163;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      background: linear-gradient(165deg, var(--bg) 0%, #f7fff3 55%, #fff 100%);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: var(--card);
      border-radius: 18px;
      padding: 28px 22px;
      box-shadow: 0 10px 40px rgba(39, 42, 38, 0.08);
      text-align: center;
    }
    .brand {
      font-size: 1.55rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 8px;
    }
    .desc {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 0.95rem;
      line-height: 1.45;
    }
    .hint {
      margin: 0 0 22px;
      color: var(--primary);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .btn {
      display: block;
      width: 100%;
      text-decoration: none;
      border-radius: 12px;
      padding: 14px 16px;
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 10px;
    }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-secondary {
      background: #f3f6f2;
      color: var(--text);
      border: 1px solid #e2ebe0;
    }
    .foot {
      margin-top: 14px;
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.4;
    }
  </style>
  ${redirectBlock}
</head>
<body>
  <main class="card">
    <h1 class="brand">Youth Paper</h1>
    <p class="desc">${escapeHtml(description)}</p>
    <p class="hint">${escapeHtml(hint)}</p>
    <a class="btn btn-primary" href="${escapeHtml(androidUrl)}">Google Play에서 받기</a>
    <a class="btn btn-secondary" href="${escapeHtml(iosUrl)}">App Store에서 받기</a>
    <p class="foot">자동으로 이동하지 않으면 위 버튼을 눌러 주세요.</p>
  </main>
</body>
</html>`;
}

/**
 * 인스타/광고 「더 알아보기」용 스토어 분기 랜딩.
 * GET /get  ·  GET /install
 *
 * 스토어 URL: ANDROID_STORE_URL / IOS_STORE_URL (미설정 시 기본값)
 * (선택) INSTALL_LANDING_TITLE, INSTALL_LANDING_DESCRIPTION, INSTALL_LANDING_OG_IMAGE
 * (선택) GOOGLE_ADS_TAG_ID=AW-… — /get 페이지 gtag (기본 AW-18343935989)
 */
function handleInstallLanding(req, res) {
  const ua = String(req.headers['user-agent'] || '');
  const inviteCode = sanitizeInviteCode(req.query?.ref);
  const androidUrl = withAndroidInviteReferrer(
    resolveStoreUrl('android'),
    inviteCode,
  );
  const iosUrl = resolveStoreUrl('ios');
  const platform = detectMobilePlatform(ua);
  const isCrawler = isLinkPreviewCrawler(ua);
  const inviteDeepLink = inviteCode
    ? `youthpaper://invite?ref=${encodeURIComponent(inviteCode)}`
    : '';

  // 미리보기 크롤러에는 리다이렉트하지 않고 OG용 HTML만
  const storeUrl =
    platform === 'ios' ? iosUrl : platform === 'android' ? androidUrl : '';
  const autoRedirectUrl = !isCrawler && storeUrl ? storeUrl : '';

  if (!isCrawler) {
    // 응답 지연 없이 집계 (실패해도 랜딩은 정상 제공)
    void recordInstallLandingVisit(req, platform).catch((error) => {
      console.warn(
        '[InstallLanding] 방문 집계 실패:',
        error?.message || error,
      );
    });
  }

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set(
    'Cache-Control',
    isCrawler ? 'public, max-age=600' : 'no-store',
  );
  return res.status(200).send(
    buildLandingHtml({
      androidUrl,
      iosUrl,
      autoRedirectUrl,
      platform: isCrawler ? 'other' : platform,
      inviteDeepLink: isCrawler ? '' : inviteDeepLink,
    }),
  );
}

router.get('/get', handleInstallLanding);
router.get('/install', handleInstallLanding);

export default router;
