export function sameMessageSender(a, b) {
  if (!a || !b) return false;
  if (a.senderId != null && b.senderId != null) return a.senderId === b.senderId;
  return a.isMe === b.isMe;
}

export function withMessageGroupFlags(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    return {
      ...msg,
      showProfile: !prev || !sameMessageSender(prev, msg) || prev.time !== msg.time,
      showTimestamp: !next || !sameMessageSender(msg, next) || msg.time !== next.time,
    };
  });
}

/**
 * 날짜 배너만 삽입
 * @param {string|null} [initialLastDateKey] — prepend 직후 right 구간: left 마지막 날짜를 넘기면 경계에서 배너가 한 번만 삽입됨(조인 배너 + right 첫 배너 중복 방지)
 */
function injectDateBannersEveryChange(messages, initialLastDateKey = null) {
  const result = [];
  let lastDateKey = initialLastDateKey;
  messages.forEach((msg) => {
    if (msg?.dateKey && msg.dateKey !== lastDateKey) {
      result.push({
        id: `banner-${msg.dateKey}-${msg.id}`,
        type: 'dateBanner',
        dateKey: msg.dateKey,
      });
      lastDateKey = msg.dateKey;
    }
    result.push(msg);
  });
  return result;
}

/**
 * @param {object[]} messages — withMessageGroupFlags 적용된 배열
 * @param {{ prependCount?: number }} [options]
 * prependCount > 0: left·right로 나눠 left에도 날짜 배너 삽입, right는 left 마지막 dateKey로 이어 받아 경계 중복 방지
 */
export function injectDateBanners(messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const raw = options.prependCount ?? 0;
  const prependCount = Math.min(Math.max(0, raw), messages.length);

  if (prependCount <= 0) {
    return injectDateBannersEveryChange(messages);
  }

  const left = messages.slice(0, prependCount);
  const right = messages.slice(prependCount);

  const leftWithBanners = injectDateBannersEveryChange(left, null);

  const lastLeftDateKey =
    left.length > 0 ? left[left.length - 1]?.dateKey ?? null : null;
  const rightWithBanners = injectDateBannersEveryChange(right, lastLeftDateKey);

  return [...leftWithBanners, ...rightWithBanners];
}
