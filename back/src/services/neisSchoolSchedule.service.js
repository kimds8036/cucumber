const NEIS_KEY = () => process.env.NEIS_API_KEY || process.env.NEIS_KEY || '';
const SCHEDULE_URL = 'https://open.neis.go.kr/hub/SchoolSchedule';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function classifyScheduleEvent(name, content = '') {
  const t = `${name || ''} ${content || ''}`.replace(/\s+/g, '');
  if (!t) return null;
  if (/개학/.test(t)) return 'open';
  if (/방학식|종업식|여름방학|겨울방학/.test(t)) return 'close';
  if (/(재량)?휴업|휴교|임시휴업/.test(t) && !/방학/.test(t)) return 'closure';
  return null;
}

export function defaultCloseYmd(openYmd, semester) {
  const y = Number(openYmd.slice(0, 4));
  if (Number(semester) === 1) return `${y}-07-20`;
  return `${y}-12-31`;
}

export function buildTermsFromEvents(events) {
  const opens = events
    .filter((e) => e.kind === 'open')
    .map((e) => e.ymd)
    .filter(Boolean)
    .sort();
  const uniqOpens = [...new Set(opens)];
  const closes = events
    .filter((e) => e.kind === 'close')
    .map((e) => e.ymd)
    .filter(Boolean)
    .sort();

  const terms = [];
  for (let i = 0; i < uniqOpens.length; i += 1) {
    const openYmd = uniqOpens[i];
    const nextOpen = uniqOpens[i + 1] || null;
    const month = Number(openYmd.slice(5, 7));
    const year = Number(openYmd.slice(0, 4));
    let semester;
    let academicYear;
    if (month >= 7) {
      semester = 2;
      academicYear = year;
    } else if (month === 1) {
      semester = 2;
      academicYear = year - 1;
    } else {
      semester = 1;
      academicYear = year;
    }

    let closeYmd = closes.find(
      (c) => c >= openYmd && (!nextOpen || c < nextOpen),
    );
    let confidence = 'high';
    if (!closeYmd) {
      closeYmd = defaultCloseYmd(openYmd, semester);
      if (nextOpen && closeYmd >= nextOpen) {
        closeYmd = nextOpen;
        // 다음 개학 전날
        const d = new Date(`${closeYmd}T12:00:00+09:00`);
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        closeYmd = `${y}-${m}-${day}`;
      }
      confidence = 'medium';
    }
    if (closeYmd < openYmd) continue;
    terms.push({
      academicYear,
      semester,
      openYmd,
      closeYmd,
      confidence,
      source: 'neis_schedule',
    });
  }

  const byKey = new Map();
  for (const t of terms) {
    const key = `${t.academicYear}-${t.semester}`;
    const prev = byKey.get(key);
    if (!prev || t.openYmd < prev.openYmd) byKey.set(key, t);
  }
  return [...byKey.values()];
}

export async function fetchSchoolScheduleEvents({
  eduOfficeCode,
  schoolCode,
  fromYmd,
  toYmd,
}) {
  const key = NEIS_KEY();
  if (!key) {
    return { ok: false, code: 'NO_KEY', events: [] };
  }
  const compactFrom = String(fromYmd).replace(/-/g, '');
  const compactTo = String(toYmd).replace(/-/g, '');
  const params = new URLSearchParams({
    KEY: key,
    Type: 'json',
    pIndex: '1',
    pSize: '1000',
    ATPT_OFCDC_SC_CODE: String(eduOfficeCode),
    SD_SCHUL_CODE: String(schoolCode),
    AA_FROM_YMD: compactFrom,
    AA_TO_YMD: compactTo,
  });
  const res = await fetch(`${SCHEDULE_URL}?${params.toString()}`);
  const json = await res.json();
  const code = json?.SchoolSchedule?.[0]?.head?.[1]?.RESULT?.CODE;
  const msg = json?.SchoolSchedule?.[0]?.head?.[1]?.RESULT?.MESSAGE;
  if (code && code !== 'INFO-000') {
    return { ok: false, code, msg, events: [] };
  }
  let rows = json?.SchoolSchedule?.[1]?.row || [];
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];
  const events = [];
  for (const r of rows) {
    const raw = String(r.AA_YMD || '');
    const ymd =
      raw.length === 8
        ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
        : raw.slice(0, 10);
    const name = String(r.EVENT_NM || '').trim();
    const content = String(r.EVENT_CNTNT || '').trim();
    const kind = classifyScheduleEvent(name, content);
    if (!kind || !ymd) continue;
    events.push({ ymd, name, content, kind });
  }
  return { ok: true, code: code || 'INFO-000', msg, events };
}

export { sleep };
