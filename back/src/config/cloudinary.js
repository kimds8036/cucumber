import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BASE_FOLDER = String(process.env.CLOUDINARY_FOLDER_BASE || 'focux')
  .trim()
  .replace(/\/$/, '');

/** Cloudinary Media Library 폴더 — 용도별 분리 */
export const CLOUDINARY_FOLDERS = {
  /** 학생증 인증 (가입·재제출, PII) */
  studentId: `${BASE_FOLDER}/verification/student-id`,
  /** 인앱 사용자 콘텐츠 */
  posts: `${BASE_FOLDER}/user/posts`,
  comments: `${BASE_FOLDER}/user/comments`,
  messages: `${BASE_FOLDER}/user/messages`,
  dm: `${BASE_FOLDER}/user/dm`,
  /** 문의 첨부 */
  inquiries: `${BASE_FOLDER}/inquiries`,
};

function createImageUpload(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1080, crop: 'limit' }],
    },
  });
  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
  });
}

export const uploadPost = createImageUpload(CLOUDINARY_FOLDERS.posts);
export const uploadComment = createImageUpload(CLOUDINARY_FOLDERS.comments);
export const uploadMessage = createImageUpload(CLOUDINARY_FOLDERS.messages);
export const uploadDm = createImageUpload(CLOUDINARY_FOLDERS.dm);
export const uploadInquiry = createImageUpload(CLOUDINARY_FOLDERS.inquiries);

/** @deprecated uploadPost 사용 */
export const upload = uploadPost;

export { cloudinary };
