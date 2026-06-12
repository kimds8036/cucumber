import { cloudinary } from '../config/cloudinary.js';
import { cropBase64Image } from '../utils/imageCrop.js';

const SIGNUP_STUDENT_ID_FOLDER = 'focux/signup-student-id';

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
        folder: SIGNUP_STUDENT_ID_FOLDER,
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
