import pool from '../config/database.js';

/** 같은 아이디·이메일 짧은 시간 내 중복 제출 방지 (분). env: INQUIRY_DEDUP_MINUTES */
export function duplicateWindowMinutes() {
  const n = Number(process.env.INQUIRY_DEDUP_MINUTES || 5);
  return Math.min(Math.max(Math.trunc(n), 1), 60);
}

/**
 * 최근 윈도우 안에 동일 연락처 문의가 있으면 반환.
 * @returns {Promise<{ id: number, created_at: Date|string }|null>}
 */
export async function findRecentDuplicateInquiry({
  contactUsername,
  contactEmail,
}) {
  const windowMinutes = duplicateWindowMinutes();
  const [[row]] = await pool.execute(
    `SELECT id, created_at
     FROM inquiries
     WHERE is_deleted = FALSE
       AND contact_username = ?
       AND contact_email = ?
       AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)
     ORDER BY id DESC
     LIMIT 1`,
    [contactUsername, contactEmail, windowMinutes],
  );
  return row || null;
}

/** 목록 행에 짧은 시간 내 동일 연락처 중복 경고 부여 */
export function annotateDuplicateWarnings(rows, windowMinutes = duplicateWindowMinutes()) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const ms = windowMinutes * 60 * 1000;
  return rows.map((row, i) => {
    const key = `${String(row.contact_username || '').trim().toLowerCase()}|${String(row.contact_email || '').trim().toLowerCase()}`;
    const at = new Date(row.created_at).getTime();
    if (!Number.isFinite(at) || !key || key === '|') {
      return { ...row, duplicateWarning: false, duplicateClusterSize: 1, duplicateWindowMinutes: windowMinutes };
    }
    let cluster = 0;
    for (let j = 0; j < rows.length; j += 1) {
      const other = rows[j];
      const key2 = `${String(other.contact_username || '').trim().toLowerCase()}|${String(other.contact_email || '').trim().toLowerCase()}`;
      if (key !== key2) continue;
      const bt = new Date(other.created_at).getTime();
      if (!Number.isFinite(bt)) continue;
      if (Math.abs(at - bt) <= ms) cluster += 1;
    }
    return {
      ...row,
      duplicateWarning: cluster > 1,
      duplicateClusterSize: cluster,
      duplicateWindowMinutes: windowMinutes,
    };
  });
}

/** 단건 상세 — DB 기준 근처 시간대 동일 연락처 건수 */
export async function getInquiryDuplicateMeta(row) {
  const windowMinutes = duplicateWindowMinutes();
  if (!row?.contact_username || !row?.contact_email || !row?.created_at) {
    return { duplicateWarning: false, duplicateClusterSize: 1, duplicateWindowMinutes: windowMinutes };
  }
  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS c
     FROM inquiries
     WHERE is_deleted = FALSE
       AND contact_username = ?
       AND contact_email = ?
       AND id != ?
       AND created_at >= DATE_SUB(?, INTERVAL ? MINUTE)
       AND created_at <= DATE_ADD(?, INTERVAL ? MINUTE)`,
    [
      row.contact_username,
      row.contact_email,
      row.id,
      row.created_at,
      windowMinutes,
      row.created_at,
      windowMinutes,
    ],
  );
  const clusterSize = Number(countRow?.c || 0) + 1;
  return {
    duplicateWarning: clusterSize > 1,
    duplicateClusterSize: clusterSize,
    duplicateWindowMinutes: windowMinutes,
  };
}
