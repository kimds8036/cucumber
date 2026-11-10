/**
 * 내 아이디/닉네임.
 *
 * TODO(이식): 기존 서버에서 받아오도록 getIdentity()만 교체한다.
 *   예) const res = await fetch("/api/me", { credentials: "include" });
 *       const me = await res.json();
 *       return { userId: String(me.id), displayName: me.nickname };
 * 반환 형식만 { userId, displayName } 으로 맞추면 나머지 코드는 그대로 동작한다.
 */

const KEY = "study-room:guest";

/** @returns {Promise<{ userId: string, displayName: string }>} */
export async function getIdentity() {
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
