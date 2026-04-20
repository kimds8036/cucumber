import admin from 'firebase-admin';

let initialized = false;

export function initFirebase() {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] 환경변수가 없어 Admin SDK 초기화를 건너뜁니다.');
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
