import AsyncStorage from '@react-native-async-storage/async-storage';

export const STUDENT_VERIFICATION_STATUS_KEY = '@student_verification_status';
export const STUDENT_VERIFICATION_REJECT_REASON_KEY =
  '@student_verification_reject_reason';

export async function getCachedStudentVerificationStatus() {
  try {
    const status = await AsyncStorage.getItem(STUDENT_VERIFICATION_STATUS_KEY);
    const rejectReason = await AsyncStorage.getItem(
      STUDENT_VERIFICATION_REJECT_REASON_KEY,
    );
    return {
      status: status || 'APPROVED',
      rejectReason: rejectReason || null,
    };
  } catch {
    return { status: 'APPROVED', rejectReason: null };
  }
}

export async function setCachedStudentVerificationStatus(status, rejectReason) {
  try {
    if (status) {
      await AsyncStorage.setItem(STUDENT_VERIFICATION_STATUS_KEY, status);
    } else {
      await AsyncStorage.removeItem(STUDENT_VERIFICATION_STATUS_KEY);
    }
    if (rejectReason) {
      await AsyncStorage.setItem(
        STUDENT_VERIFICATION_REJECT_REASON_KEY,
        rejectReason,
      );
    } else {
      await AsyncStorage.removeItem(STUDENT_VERIFICATION_REJECT_REASON_KEY);
    }
  } catch {
    // ignore
  }
}

export async function clearCachedStudentVerificationStatus() {
  try {
    await AsyncStorage.multiRemove([
      STUDENT_VERIFICATION_STATUS_KEY,
      STUDENT_VERIFICATION_REJECT_REASON_KEY,
    ]);
  } catch {
    // ignore
  }
}
