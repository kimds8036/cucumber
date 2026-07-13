import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGAL_DIR = path.join(__dirname, 'legal');

const DEFAULT_DOCUMENTS = [
  {
    slug: 'terms_of_service',
    title: '서비스 이용약관',
    file: 'service-terms.md',
    version: 'v1.2.1',
  },
  {
    slug: 'privacy_policy',
    title: '개인정보 처리방침',
    file: 'privacy-policy.md',
    version: 'v1.4.1',
  },
];

export async function seedLegalDocuments(connection) {
  let inserted = 0;

  for (const doc of DEFAULT_DOCUMENTS) {
    const [existing] = await connection.execute(
      'SELECT slug FROM legal_documents WHERE slug = ? LIMIT 1',
      [doc.slug],
    );
    if (existing.length > 0) continue;

    const filePath = path.join(LEGAL_DIR, doc.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  legal seed skip: ${doc.file} 없음`);
      continue;
    }

    const contentMd = fs.readFileSync(filePath, 'utf8');
    await connection.execute(
      `INSERT INTO legal_documents (slug, title, version, content_md)
       VALUES (?, ?, ?, ?)`,
      [doc.slug, doc.title, doc.version, contentMd],
    );
    inserted += 1;
  }

  return inserted;
}
