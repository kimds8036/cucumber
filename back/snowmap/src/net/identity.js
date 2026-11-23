/**
 * 내 아이디/닉네임.
 *
 * 앱 WebView는 ?userId=&displayName= 으로 넘긴다.
 * 브라우저에서 바로 열면 게스트로 둔다.
 */

const KEY = "study-room:guest";

function identityFromQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    const userId = String(params.get("userId") || "").trim();
    const displayName = String(
      params.get("displayName") || params.get("username") || "",
    ).trim();
    const avatarUrl = String(
      params.get("avatarUrl") || params.get("avatar") || "",
    ).trim() || null;
    if (userId || displayName) {
      return {
        userId: userId || `user:${displayName}`,
        displayName: displayName || userId,
        avatarUrl,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** @returns {Promise<{ userId: string, displayName: string }>} */
export async function getIdentity() {
  const fromApp = identityFromQuery();
  if (fromApp) return fromApp;

  // 탭마다 다른 게스트가 되도록 sessionStorage (같은 PC에서 탭 2개로 멀티 테스트)
  const saved = sessionStorage.getItem(KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      sessionStorage.removeItem(KEY);
    }
  }
  const num = Math.floor(1000 + Math.random() * 9000);
  const identity = {
    userId: `guest-${num}-${Date.now().toString(36)}`,
    displayName: `게스트${num}`,
  };
  sessionStorage.setItem(KEY, JSON.stringify(identity));
  return identity;
}
