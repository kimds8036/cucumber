import { cloudinary, CLOUDINARY_FOLDERS } from '../config/cloudinary.js';
import { cropBase64Image } from '../utils/imageCrop.js';

function stripDataUriPrefix(imageBase64) {
  return String(imageBase64 || '').replace(/^data:image\/\w+;base64,/, '');
}

function normalizeCropRegion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const x = Number(raw.x);
  const y = Number(raw.y);
  const width = Number(raw.width);
  const height = Number(raw.height);
  if (
    ![x, y, width, height].every((n) => Number.isFinite(n)) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    width: Math.min(1, Math.max(0.02, width)),
    height: Math.min(1, Math.max(0.02, height)),
  };
}

export async function uploadUserAvatarImage({ imageBase64, cropRegion = null }) {
  const raw = stripDataUriPrefix(imageBase64);
  if (!raw) {
    const err = new Error('IMAGE_REQUIRED');
    err.code = 'IMAGE_REQUIRED';
    throw err;
  }
  if (raw.length > 7_000_000) {
    const err = new Error('IMAGE_TOO_LARGE');
    err.code = 'IMAGE_TOO_LARGE';
    throw err;
  }

  const crop = normalizeCropRegion(cropRegion);
  let buffer = Buffer.from(raw, 'base64');
  if (crop) {
    buffer = await cropBase64Image(imageBase64, crop);
  }

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDERS.avatars,
        resource_type: 'image',
        format: 'jpg',
        transformation: [{ width: 512, height: 512, crop: 'fill' }],
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
    avatarUrl: result.secure_url,
    avatarPublicId: result.public_id || null,
  };
}

export async function destroyUserAvatar(publicId) {
  const id = String(publicId || '').trim();
  if (!id) return;
  try {
    await cloudinary.uploader.destroy(id);
  } catch {
    // 교체 실패해도 새 URL은 유지
  }
}
