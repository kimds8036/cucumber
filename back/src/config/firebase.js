import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let initialized = false;

export function initFirebase() {
  if (initialized) return;

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), 'firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    try {
      const raw = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount?.project_id,
      });
      initialized = true;
      console.log(
        `[Firebase] Admin SDK 초기화 완료 (service account file: ${serviceAccountPath}, projectId: ${serviceAccount?.project_id || 'unknown'})`,
      );
      return;
    } catch (error) {
      console.error('[Firebase] 서비스 계정 파일 초기화 실패, env 기반으로 재시도합니다:', error?.message || error);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] 서비스 계정 파일/환경변수가 없어 Admin SDK 초기화를 건너뜁니다.');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  initialized = true;
  console.log('[Firebase] Admin SDK 초기화 완료');
}

export function getMessaging() {
  if (!initialized) {
    initFirebase();
  }
  return initialized ? admin.messaging() : null;
}

export function getAuthAdmin() {
  if (!initialized) {
    initFirebase();
  }
  return initialized ? admin.auth() : null;
}

/** Firebase Phone Auth ID Token 검증 */
export async function verifyFirebaseIdToken(idToken) {
  const authAdmin = getAuthAdmin();
  if (!authAdmin) {
    throw new Error('Firebase Admin SDK가 초기화되지 않았습니다.');
  }
  return authAdmin.verifyIdToken(idToken);
}
