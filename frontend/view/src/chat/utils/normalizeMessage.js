export function parseUtcToLocal(createdAt) {
  if (!createdAt) return null;
  let s = String(createdAt).trim();
  if (!s) return null;
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s) &&
    !/[Z+-]\d{2}:?\d{2}$/.test(s) &&
    !/Z$/.test(s)
  ) {
    s = s.replace(' ', 'T') + 'Z';
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatChatTime(createdAt) {
  const d = parseUtcToLocal(createdAt);
  if (!d) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getDateKey(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function normalizeMessage(raw, meId) {
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const d = parseUtcToLocal(createdAt);
  const senderId = raw.sender_id ?? raw.senderId ?? null;
  const isMe = meId != null && senderId != null
    ? Number(senderId) === Number(meId)
    : false;

  const images = (() => {
    const value = raw.images;
    if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [value];
      } catch {
        return [value];
      }
    }
    return [];
  })();

  const senderName =
    raw.sender_name ??
    raw.senderName ??
    (isMe ? null : raw.opponentName ?? null) ??
    (isMe ? '나' : '익명');

  return {
    id: String(raw.id),
    clientId: raw.client_id ?? raw.clientId ?? null,
    senderId: senderId != null ? Number(senderId) : null,
    senderName,
    isMe,
    content: raw.content ?? null,
    images,
    parent_message_id: raw.parent_message_id ?? raw.parentMessageId ?? null,
    parent_content: raw.parent_content ?? null,
    parent_sender_name: raw.parent_sender_name ?? null,
    createdAt,
    dateKey: getDateKey(d),
    time: formatChatTime(createdAt),
    is_deleted: Boolean(raw.is_deleted),
    isReadByOther: isMe ? Boolean(raw.is_read) : undefined,
    isReadByMe: !isMe ? Boolean(raw.is_read) : undefined,
    status: raw.status ?? (raw.isFailed ? 'failed' : raw.isSending ? 'sending' : 'sent'),
    isSending: Boolean(raw.isSending),
    isFailed: Boolean(raw.isFailed),
  };
}
