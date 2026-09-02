import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGAL_DIR = path.join(__dirname, 'legal');

/** @type {Array<{ slug: string; title: string; file: string; version: string }>} */
export const DEFAULT_LEGAL_DOCUMENTS = [
  {
    slug: 'terms_of_service',
    title: '서비스 이용약관',
    file: 'service-terms.md',
    version: 'v1.3.1',
  },
  {
    slug: 'privacy_policy',
    title: '개인정보 처리방침',
    file: 'privacy-policy.md',
    version: 'v1.5.1',
  },
  {
    slug: 'community_guide',
    title: '커뮤니티 가이드',
    file: 'community-guide.md',
    version: 'v1.1.1',
  },
  {
    slug: 'youth_protection_policy',
    title: '청소년 보호정책',
    file: 'youth-protect-policy.md',
    version: 'v1.1.1',
  },
  {
    slug: 'open_source_licenses',
    title: '오픈소스 라이선스',
    file: 'open-source-licenses.md',
    version: 'v1.1.1',
  },
];

export async function seedLegalDocuments(connection) {
  let inserted = 0;

  for (const doc of DEFAULT_LEGAL_DOCUMENTS) {
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
