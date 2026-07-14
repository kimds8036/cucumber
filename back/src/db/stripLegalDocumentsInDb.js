import { stripLegalDocumentPreamble } from '../utils/legalDocumentContent.js';

/** 기존 DB 본문에서 중복 메타 블록을 제거합니다. */
export async function stripLegalDocumentsInDb(connection) {
  const [rows] = await connection.execute(
    'SELECT slug, content_md FROM legal_documents',
  );
  let updated = 0;

  for (const row of rows) {
    const stripped = stripLegalDocumentPreamble(row.content_md);
    if (stripped === row.content_md) continue;
    await connection.execute(
      'UPDATE legal_documents SET content_md = ? WHERE slug = ?',
      [stripped, row.slug],
    );
    updated += 1;
  }

  return updated;
}
