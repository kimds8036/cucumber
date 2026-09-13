/**
 * 015 — 법적 문서 v2.0.0 (전연령 가입 · 선택적 학생 인증 · 성인·미성년 보호)
 * SQL 없음: md 파일 → legal_documents upsert + 이력 보관
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_LEGAL_DOCUMENTS } from './seedLegalDocuments.js';
import { stripLegalDocumentPreamble } from '../utils/legalDocumentContent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGAL_DIR = path.join(__dirname, 'legal');

function norm(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u201c|\u201d/g, '"')
    .trim();
}

/**
 * @returns {Promise<string[]>}
 */
export async function applyLegalDocumentsV2_015(connection) {
  const summary = [];

  for (const doc of DEFAULT_LEGAL_DOCUMENTS) {
    // 오픈소스는 이번 개정 대상 아님 (버전 유지)
    if (doc.slug === 'open_source_licenses') continue;

    const filePath = path.join(LEGAL_DIR, doc.file);
    if (!fs.existsSync(filePath)) {
      summary.push(`${doc.slug}:file-missing`);
      continue;
    }

    const nextContent = stripLegalDocumentPreamble(
      norm(fs.readFileSync(filePath, 'utf8')),
    );

    const [rows] = await connection.execute(
      `SELECT slug, title, version, content_md AS contentMd
       FROM legal_documents WHERE slug = ? LIMIT 1`,
      [doc.slug],
    );
    const current = rows[0];
    if (!current) {
      await connection.execute(
        `INSERT INTO legal_documents (slug, title, version, content_md)
         VALUES (?, ?, ?, ?)`,
        [doc.slug, doc.title, doc.version, nextContent],
      );
      summary.push(`${doc.slug}:insert`);
      continue;
    }

    const changed =
      current.title !== doc.title ||
      current.version !== doc.version ||
      norm(current.contentMd) !== norm(nextContent);

    if (!changed) {
      summary.push(`${doc.slug}:skip`);
      continue;
    }

    await connection.execute(
      `INSERT INTO legal_document_revisions
         (document_slug, title, version, content_md, archived_by_admin_id)
       VALUES (?, ?, ?, ?, NULL)`,
      [current.slug, current.title, current.version, current.contentMd],
    );
    await connection.execute(
      `UPDATE legal_documents
       SET title = ?, version = ?, content_md = ?, updated_by_admin_id = NULL
       WHERE slug = ?`,
      [doc.title, doc.version, nextContent, doc.slug],
    );
    summary.push(`${doc.slug}:${doc.version}`);
  }

  return summary;
}
