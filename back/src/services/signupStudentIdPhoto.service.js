import { cloudinary, CLOUDINARY_FOLDERS } from '../config/cloudinary.js';
import { cropBase64Image } from '../utils/imageCrop.js';

function stripDataUriPrefix(imageBase64) {
  return String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
}

/**
 * 학생증 base64 → Cloudinary 업로드 (가입 전, 비로그인)
 */
export async function uploadSignupStudentIdPhoto({ imageBase64, cropRegion = null }) {
  const raw = stripDataUriPrefix(imageBase64);
  if (!raw) {
    const err = new Error('IMAGE_REQUIRED');
    err.code = 'IMAGE_REQUIRED';
    throw err;
  }

  let buffer = Buffer.from(raw, 'base64');
  if (cropRegion && typeof cropRegion === 'object') {
    buffer = await cropBase64Image(imageBase64, cropRegion);
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDERS.studentId,
        resource_type: 'image',
        format: 'jpg',
        transformation: [{ width: 1600, crop: 'limit' }],
      },
      (error, uploadResult) => {
        if (error) reject(error);
        else resolve(uploadResult);
      },
    );
    uploadStream.end(buffer);
  });

  if (!result?.secure_url) {
    const err = new Error('CLOUDINARY_UPLOAD_FAILED');
    err.code = 'CLOUDINARY_UPLOAD_FAILED';
    throw err;
  }

  return {
    cloudinaryUrl: result.secure_url,
    cloudinaryPublicId: result.public_id || null,
  };
}

/** 1~2장 업로드 결과를 DB 컬럼용으로 묶음 (2장이면 JSON) */
export function packStudentIdCloudinaryPayload(primary, secondary = null) {
  if (!secondary?.cloudinaryUrl) {
    return {
      cloudinaryUrl: primary.cloudinaryUrl,
      cloudinaryPublicId: primary.cloudinaryPublicId || null,
    };
  }
  return {
    cloudinaryUrl: JSON.stringify({
      v: 1,
      primary: primary.cloudinaryUrl,
      secondary: secondary.cloudinaryUrl,
    }),
    cloudinaryPublicId: JSON.stringify({
      v: 1,
      primary: primary.cloudinaryPublicId || null,
      secondary: secondary.cloudinaryPublicId || null,
    }),
  };
}

/** 관리자·Discord 표시용 URL 파싱 */
export function parseStudentIdCloudinaryUrls(raw) {
  const s = String(raw || '').trim();
  if (!s) return { primary: null, secondary: null, urls: [] };
  if (s.startsWith('{')) {
    try {
      const j = JSON.parse(s);
      const primary = j.primary || j.urls?.[0] || null;
      const secondary = j.secondary || j.urls?.[1] || null;
      return {
        primary,
        secondary,
        urls: [primary, secondary].filter(Boolean),
      };
    } catch {
      return { primary: s, secondary: null, urls: [s] };
    }
  }
  return { primary: s, secondary: null, urls: [s] };
}
