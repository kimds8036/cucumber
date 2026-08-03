import { requireNativeModule } from 'expo-modules-core';

type YouthPaperWidgetNative = {
  writeMealPayload(json: string): Promise<void>;
  writeTimetablePayload(json: string): Promise<void>;
  writeSchoolId(schoolId: string): Promise<void>;
  writeApiBaseUrl(url: string): Promise<void>;
  writeAuthMirror(json: string): Promise<void>;
  clearAuthMirror(): Promise<void>;
  readAuthMirror(): Promise<string | null>;
  reloadWidgets(): Promise<void>;
  scheduleBackgroundRefresh(): Promise<void>;
};

let native: YouthPaperWidgetNative | null = null;

try {
  native = requireNativeModule<YouthPaperWidgetNative>('YouthPaperWidget');
} catch {
  native = null;
}

const unavailable = (method: string) =>
  Promise.reject(
    new Error(`[YouthPaperWidget] native unavailable for ${method}`),
  );

const YouthPaperWidget = {
  /** false 이면 Pod/autolink 미연결 — JS stub no-op 로 성공 처리하면 안 됨 */
  isAvailable: Boolean(native),
  writeMealPayload: (json: string) =>
    native ? native.writeMealPayload(json) : unavailable('writeMealPayload'),
  writeTimetablePayload: (json: string) =>
    native
      ? native.writeTimetablePayload(json)
      : unavailable('writeTimetablePayload'),
  writeSchoolId: (schoolId: string) =>
    native ? native.writeSchoolId(schoolId) : unavailable('writeSchoolId'),
  writeApiBaseUrl: (url: string) =>
    native ? native.writeApiBaseUrl(url) : unavailable('writeApiBaseUrl'),
  writeAuthMirror: (json: string) =>
    native ? native.writeAuthMirror(json) : unavailable('writeAuthMirror'),
  clearAuthMirror: () =>
    native ? native.clearAuthMirror() : unavailable('clearAuthMirror'),
  readAuthMirror: async () => {
    if (!native) return null;
    return native.readAuthMirror();
  },
  reloadWidgets: () =>
    native ? native.reloadWidgets() : unavailable('reloadWidgets'),
  scheduleBackgroundRefresh: () =>
    native
      ? native.scheduleBackgroundRefresh()
      : unavailable('scheduleBackgroundRefresh'),
};

export default YouthPaperWidget;
