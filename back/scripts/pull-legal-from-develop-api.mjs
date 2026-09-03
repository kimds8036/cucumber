/**
 * production 컨테이너(또는 DB_* 가 production 인 환경)에서
 * develop 공개 API 본문을 읽어 legal_documents 를 동기화합니다.
 * 사용: railway ssh -e production -s cucumber -- node scripts/pull-legal-from-develop-api.mjs
 * 로컬 배포 이미지에 스크립트가 없을 수 있으므로, ssh 시에는 inline 실행을 권장합니다.
 */
import mysql from 'mysql2/promise';

const DEV_API = 'https://cucumber-develop.up.railway.app/api/legal';
const SLUGS = [
  'terms_of_service',
  'privacy_policy',
  'community_guide',
  'youth_protection_policy',
  'open_source_licenses',
];

function norm(s) {
  return String(s || '').replace(/\r\n/g, '\n').trim();
}

async function main() {
  const host = process.env.DB_PRIVATE_HOST || process.env.DB_HOST || 'mysql.railway.internal';
  const port = Number(process.env.DB_PRIVATE_PORT || process.env.DB_PORT || 3306);
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  if (!user || !password || !database) {
    throw new Error('DB_USER/DB_PASSWORD/DB_NAME required');
  }

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
  });
  await conn.query("SET SESSION time_zone = '+00:00'");

  try {
    for (const slug of SLUGS) {
      const res = await fetch(`${DEV_API}/${slug}`);
      if (!res.ok) throw new Error(`fetch ${slug}: ${res.status}`);
      const json = await res.json();
      const doc = json.data;
      if (!doc?.contentMd) throw new Error(`empty ${slug}`);

      const [rows] = await conn.execute(
        `SELECT slug, title, version, content_md AS contentMd
         FROM legal_documents WHERE slug = ? LIMIT 1`,
        [slug],
      );
      const current = rows[0];
      if (!current) throw new Error(`missing ${slug}`);

      const next = {
        title: doc.title,
        version: doc.version,
        contentMd: norm(doc.contentMd),
      };
      const changed =
        current.title !== next.title ||
        current.version !== next.version ||
        norm(current.contentMd) !== next.contentMd;

      if (!changed) {
        console.log(`${slug} unchanged (${next.version})`);
        continue;
      }

      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO legal_document_revisions
           (document_slug, title, version, content_md, archived_by_admin_id)
         VALUES (?, ?, ?, ?, NULL)`,
        [current.slug, current.title, current.version, current.contentMd],
      );
      await conn.execute(
        `UPDATE legal_documents
         SET title = ?, version = ?, content_md = ?, updated_by_admin_id = NULL
         WHERE slug = ?`,
        [next.title, next.version, next.contentMd, slug],
      );
      await conn.commit();
      console.log(`${slug} → ${next.version}`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
