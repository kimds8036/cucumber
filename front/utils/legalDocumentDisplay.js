const META_LINE = /^\*\*(제정일|시행일|버전)\*\*:.*$/i;
const H1_LINE = /^# .+$/;

/** API/번들 본문에서 DB로 표시할 메타데이터 블록을 제거합니다. */
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

export function formatLegalDateYmd(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(d)
    .slice(0, 10);
}

export function addDaysToYmd(ymd, deltaDays) {
  if (!ymd) return '';
  const ref = new Date(`${ymd}T12:00:00+09:00`);
  ref.setTime(ref.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
    .format(ref)
    .slice(0, 10);
}
