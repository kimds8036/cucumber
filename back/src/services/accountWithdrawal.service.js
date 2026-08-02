import pool from '../config/database.js';
import { cloudinary } from '../config/cloudinary.js';
import { revokeAllRefreshTokens } from './refreshToken.service.js';
import { incrementTokenVersion } from './session.service.js';

/**
 * 회원 탈퇴 (개인정보 처리방침 §3):
 * - users 행 hard DELETE 금지 (게시글·댓글 FK CASCADE로 콘텐츠가 사라짐)
 * - is_deleted + PII 삭제(익명화) · phone_lookup 해제(동일 번호 재가입 허용)
 * - username 유지 → 재로그인 시 「탈퇴한 사용자」 안내
 * - 세션·FCM 무효화 · 학생증 Cloudinary 이미지 삭제 시도
 */
export async function withdrawUserAccount(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('INVALID_USER');
    err.code = 'INVALID_USER';
    throw err;
  }

  const connection = await pool.getConnection();
  let publicIds = [];

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, is_deleted
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [id],
    );

    if (!rows.length) {
      const err = new Error('USER_NOT_FOUND');
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    if (rows[0].is_deleted) {
      const err = new Error('ALREADY_WITHDRAWN');
      err.code = 'ALREADY_WITHDRAWN';
      throw err;
    }

    const [sidRows] = await connection.execute(
      `SELECT cloudinary_public_id
       FROM signup_student_id_submissions
       WHERE user_id = ?
         AND cloudinary_public_id IS NOT NULL
         AND cloudinary_public_id <> ''`,
      [id],
    );
    publicIds = sidRows
      .map((r) => String(r.cloudinary_public_id || '').trim())
      .filter(Boolean);

    await connection.execute(
      `UPDATE users
       SET is_deleted = TRUE,
           deleted_at = CURRENT_TIMESTAMP,
           name_enc = NULL,
           name_lookup = NULL,
           phone_enc = NULL,
           phone_lookup = NULL,
           birth_date_enc = NULL,
           phone_verified = FALSE,
           student_verified = FALSE
       WHERE id = ? AND is_deleted = FALSE`,
      [id],
    );

    await connection.execute(
      `UPDATE signup_student_id_submissions
       SET name_enc = NULL,
           phone_enc = NULL,
           phone_lookup = NULL,
           birth_date_enc = NULL,
           cloudinary_url = '',
           cloudinary_public_id = NULL
       WHERE user_id = ?`,
      [id],
    );

    await connection.execute(
      `UPDATE signup_certificate_submissions
       SET name_enc = NULL,
           phone_enc = NULL,
           phone_lookup = NULL,
           birth_date_enc = NULL,
           certificate_view_url = '',
           certificate_access_code = ''
       WHERE user_id = ?`,
      [id],
    );

    await connection.execute(
      `UPDATE fcm_tokens
       SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = ? AND is_active = TRUE`,
      [id],
    );

    await connection.execute(`DELETE FROM user_devices WHERE user_id = ?`, [id]);

    await incrementTokenVersion(id, connection);

    await connection.commit();
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    connection.release();
  }

  try {
    await revokeAllRefreshTokens(id);
  } catch (revokeErr) {
    console.warn('[withdraw] refresh revoke:', revokeErr?.message || revokeErr);
  }

  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch (cloudErr) {
      console.warn(
        '[withdraw] cloudinary destroy failed:',
        publicId,
        cloudErr?.message || cloudErr,
      );
    }
  }

  return { userId: id };
}
