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

export function injectDateBanners(messages) {
  const result = [];
  let lastDateKey = null;
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
