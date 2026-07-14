const META_LINE = /^\*\*(제정일|시행일|버전)\*\*:.*$/i;
const H1_LINE = /^# .+$/;

function toKstYmd(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(d)
    .slice(0, 10);
}

function addKstDays(ymd, deltaDays) {
  if (!ymd) return null;
  const ref = new Date(`${ymd}T12:00:00+09:00`);
  ref.setTime(ref.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(ref)
    .slice(0, 10);
}

/** 본문 선두의 H1·제정일·시행일·버전·구분선을 제거합니다. */
export function stripLegalDocumentPreamble(contentMd) {
  const lines = String(contentMd || '').split('\n');
  const out = [];
  let skipping = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (skipping) {
      if (!trimmed) continue;
      if (H1_LINE.test(trimmed)) continue;
      if (META_LINE.test(trimmed)) continue;
      if (trimmed === '---') continue;
      skipping = false;
    }
    out.push(line);
  }

  while (out.length && !out[0].trim()) out.shift();
  return out.join('\n');
}

/** 수정일(updated_at)을 제정일로, +7일을 시행일로 계산합니다. */
export function buildLegalDocumentDates(updatedAt) {
  const enactedAt = toKstYmd(updatedAt);
  return {
    enactedAt,
    effectiveAt: enactedAt ? addKstDays(enactedAt, 7) : null,
  };
}
