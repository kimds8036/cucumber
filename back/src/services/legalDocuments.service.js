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

function mapRevisionRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    documentSlug: row.document_slug,
    title: row.title,
    version: row.version,
    contentMd: row.content_md,
    archivedAt: row.archived_at,
    archivedByAdminId: row.archived_by_admin_id,
  };
}

function hasLegalContentChanged(current, next) {
  if (!current) return false;
  return (
    current.title !== next.title ||
    current.version !== next.version ||
    current.contentMd !== next.contentMd
  );
}

async function archiveLegalRevision(connection, current, archivedByAdminId) {
  if (!current) return;
  await connection.execute(
    `INSERT INTO legal_document_revisions
       (document_slug, title, version, content_md, archived_by_admin_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      current.slug,
      current.title,
      current.version,
      current.contentMd,
      archivedByAdminId ?? null,
    ],
  );
}

export async function listLegalDocuments() {
  const [rows] = await pool.execute(
    `SELECT slug, title, version, updated_at, updated_by_admin_id
     FROM legal_documents
     ORDER BY slug ASC`,
  );
  return rows.map((row) => mapLegalRow(row));
}

export async function getLegalDocumentBySlug(slug, connection = null) {
  const normalized = normalizeLegalSlug(slug);
  if (!isLegalDocumentSlug(normalized)) return null;

  const exec = connection ? connection.execute.bind(connection) : pool.execute.bind(pool);
  const [rows] = await exec(
    `SELECT slug, title, version, content_md, updated_at, updated_by_admin_id
     FROM legal_documents
     WHERE slug = ?
     LIMIT 1`,
    [normalized],
  );
  return mapLegalRow(rows[0] || null);
}

export async function listLegalDocumentRevisions(slug, { limit = 30 } = {}) {
  const normalized = normalizeLegalSlug(slug);
  if (!isLegalDocumentSlug(normalized)) return [];

  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [rows] = await pool.execute(
    `SELECT id, document_slug, title, version, archived_at, archived_by_admin_id
     FROM legal_document_revisions
     WHERE document_slug = ?
     ORDER BY archived_at DESC, id DESC
     LIMIT ${safeLimit}`,
    [normalized],
  );
  return rows.map((row) => mapRevisionRow(row));
}

export async function getLegalDocumentRevision(slug, revisionId) {
  const normalized = normalizeLegalSlug(slug);
  const id = Number(revisionId);
  if (!isLegalDocumentSlug(normalized) || !Number.isFinite(id) || id <= 0) {
    return null;
  }

  const [rows] = await pool.execute(
    `SELECT id, document_slug, title, version, content_md, archived_at, archived_by_admin_id
     FROM legal_document_revisions
     WHERE document_slug = ? AND id = ?
     LIMIT 1`,
    [normalized, id],
  );
  return mapRevisionRow(rows[0] || null);
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

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const current = await getLegalDocumentBySlug(normalized, connection);
    if (!current) {
      const err = new Error('LEGAL_NOT_FOUND');
      err.code = 'LEGAL_NOT_FOUND';
      throw err;
    }

    const next = {
      title: trimmedTitle,
      version: trimmedVersion,
      contentMd: trimmedContent,
    };

    if (hasLegalContentChanged(current, next)) {
      await archiveLegalRevision(connection, current, updatedByAdminId);
    }

    const [result] = await connection.execute(
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

    await connection.commit();
    return getLegalDocumentBySlug(normalized);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
