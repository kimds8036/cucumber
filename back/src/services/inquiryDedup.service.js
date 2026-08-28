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

export function inquiryContactKey(row) {
  return `${String(row.contact_username || '').trim().toLowerCase()}|${String(row.contact_email || '').trim().toLowerCase()}`;
}

/** 짧은 시간·동일 연락처 문의를 transitive 클러스터로 묶음 */
export function clusterDuplicateInquiries(rows, windowMinutes = duplicateWindowMinutes()) {
  if (!Array.isArray(rows) || !rows.length) return [];
  const ms = windowMinutes * 60 * 1000;
  const sorted = [...rows].sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
  const used = new Set();
  const groups = [];

  for (const row of sorted) {
    if (used.has(row.id)) continue;
    const contactKey = inquiryContactKey(row);
    if (!contactKey || contactKey === '|') {
      groups.push({
        clusterKey: `solo:${row.id}`,
        items: [row],
        isDuplicateCluster: false,
        duplicateClusterSize: 1,
        duplicateWindowMinutes: windowMinutes,
        headId: row.id,
      });
      used.add(row.id);
      continue;
    }

    const cluster = [row];
    used.add(row.id);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of sorted) {
        if (used.has(other.id)) continue;
        if (inquiryContactKey(other) !== contactKey) continue;
        const bt = new Date(other.created_at).getTime();
        if (!Number.isFinite(bt)) continue;
        for (const member of cluster) {
          const mt = new Date(member.created_at).getTime();
          if (!Number.isFinite(mt)) continue;
          if (Math.abs(bt - mt) <= ms) {
            cluster.push(other);
            used.add(other.id);
            changed = true;
            break;
          }
        }
      }
    }

    cluster.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const ids = cluster.map((c) => c.id).sort((a, b) => a - b);
    const clusterKey = cluster.length > 1 ? `dup:${contactKey}:${ids.join('-')}` : `solo:${row.id}`;
    groups.push({
      clusterKey,
      items: cluster,
      isDuplicateCluster: cluster.length > 1,
      duplicateClusterSize: cluster.length,
      duplicateWindowMinutes: windowMinutes,
      headId: cluster[0].id,
    });
  }

  groups.sort((a, b) => new Date(b.items[0].created_at) - new Date(a.items[0].created_at));
  return groups;
}

/** 목록 행에 중복 클러스터 메타 부여 (관리자 목록 묶음용) */
export function annotateDuplicateClusters(rows, windowMinutes = duplicateWindowMinutes()) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];
  const groups = clusterDuplicateInquiries(rows, windowMinutes);
  const metaById = new Map();

  for (const group of groups) {
    const ids = group.items.map((item) => item.id);
    group.items.forEach((row, index) => {
      metaById.set(row.id, {
        duplicateClusterKey: group.clusterKey,
        duplicateClusterIds: ids,
        isDuplicateClusterHead: row.id === group.headId,
        duplicateClusterIndex: index,
        duplicateWarning: group.isDuplicateCluster,
        duplicateClusterSize: group.duplicateClusterSize,
        duplicateWindowMinutes: group.duplicateWindowMinutes,
      });
    });
  }

  return rows.map((row) => ({
    ...row,
    ...(metaById.get(row.id) || {
      duplicateClusterKey: `solo:${row.id}`,
      duplicateClusterIds: [row.id],
      isDuplicateClusterHead: true,
      duplicateClusterIndex: 0,
      duplicateWarning: false,
      duplicateClusterSize: 1,
      duplicateWindowMinutes: windowMinutes,
    }),
  }));
}

/** @deprecated annotateDuplicateClusters 사용 */
export function annotateDuplicateWarnings(rows, windowMinutes = duplicateWindowMinutes()) {
  return annotateDuplicateClusters(rows, windowMinutes);
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

/** 단건 상세 — 같은 클러스터 내 다른 문의 */
export async function getInquiryDuplicateSiblings(row) {
  const windowMinutes = duplicateWindowMinutes();
  if (!row?.contact_username || !row?.contact_email || !row?.created_at) {
    return [];
  }
  const [siblingRows] = await pool.execute(
    `SELECT id, status, content, created_at
     FROM inquiries
     WHERE is_deleted = FALSE
       AND contact_username = ?
       AND contact_email = ?
       AND id != ?
       AND created_at >= DATE_SUB(?, INTERVAL ? MINUTE)
       AND created_at <= DATE_ADD(?, INTERVAL ? MINUTE)
     ORDER BY created_at DESC`,
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
  return siblingRows || [];
}
