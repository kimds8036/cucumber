/**
 * 서버 인증 토큰.
 * 앱 WebView는 페이지가 뜨기 전에 window.__STUDY_CAFE_AUTH__ = { token } 를 넣어 준다
 * (TimerAniLab.jsx injectedJavaScriptBeforeContentLoaded). URL에는 토큰을 싣지 않는다.
 * 토큰이 만료되면 앱 브릿지에 새 토큰을 달라고 한다(setTokenRefresher).
 */

/** @type {null | (() => Promise<string|null>)} */
let refresher = null;
/** @type {Promise<string|null>|null} */
let refreshing = null;

export function getAuthToken() {
  try {
    const token = window.__STUDY_CAFE_AUTH__?.token;
    return typeof token === "string" && token ? token : null;
  } catch {
    return null;
  }
}

function setAuthToken(token) {
  if (!token) return;
  window.__STUDY_CAFE_AUTH__ = { ...(window.__STUDY_CAFE_AUTH__ || {}), token };
}

/** @param {() => Promise<string|null>} fn */
export function setTokenRefresher(fn) {
  refresher = typeof fn === "function" ? fn : null;
}

/** 새 토큰을 받아 온다. 동시에 여러 번 불러도 한 번만 요청한다. 실패하면 null */
export async function refreshAuthToken() {
  if (!refresher) return null;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const token = await refresher();
        if (token) setAuthToken(token);
        return token || null;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}
