import pool from '../config/database.js';

export const LEGAL_DOCUMENT_SLUGS = new Set([
  'terms_of_service',
  'privacy_policy',
]);

export function normalizeLegalSlug(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
}

export function isLegalDocumentSlug(slug) {
  return LEGAL_DOCUMENT_SLUGS.has(slug);
}

function mapLegalRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    version: row.version,
    contentMd: row.content_md,
    updatedAt: row.updated_at,
    updatedByAdminId: row.updated_by_admin_id,
  };
}

export async function listLegalDocuments() {
  const [rows] = await pool.execute(
    `SELECT slug, title, version, updated_at, updated_by_admin_id
     FROM legal_documents
     ORDER BY slug ASC`,
  );
  return rows.map((row) => mapLegalRow(row));
}

export async function getLegalDocumentBySlug(slug) {
  const normalized = normalizeLegalSlug(slug);
  if (!isLegalDocumentSlug(normalized)) return null;

  const [rows] = await pool.execute(
    `SELECT slug, title, version, content_md, updated_at, updated_by_admin_id
     FROM legal_documents
     WHERE slug = ?
     LIMIT 1`,
    [normalized],
  );
  return mapLegalRow(rows[0] || null);
}

export async function updateLegalDocument({
  slug,
  title,
  version,
  contentMd,
  updatedByAdminId,
}) {
  const normalized = normalizeLegalSlug(slug);
  if (!isLegalDocumentSlug(normalized)) {
    const err = new Error('INVALID_LEGAL_SLUG');
    err.code = 'INVALID_LEGAL_SLUG';
    throw err;
  }

  const trimmedTitle = String(title || '').trim();
  const trimmedVersion = String(version || '').trim();
  const trimmedContent = String(contentMd || '').trim();

  if (!trimmedTitle || !trimmedVersion || !trimmedContent) {
    const err = new Error('LEGAL_FIELDS_REQUIRED');
    err.code = 'LEGAL_FIELDS_REQUIRED';
    throw err;
  }

  const [result] = await pool.execute(
    `UPDATE legal_documents
     SET title = ?, version = ?, content_md = ?, updated_by_admin_id = ?
     WHERE slug = ?`,
    [
      trimmedTitle,
      trimmedVersion,
      trimmedContent,
      updatedByAdminId ?? null,
      normalized,
    ],
  );

  if (!result.affectedRows) {
    const err = new Error('LEGAL_NOT_FOUND');
    err.code = 'LEGAL_NOT_FOUND';
    throw err;
  }

  return getLegalDocumentBySlug(normalized);
}
