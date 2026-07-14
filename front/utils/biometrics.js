import * as LocalAuthentication from 'expo-local-authentication';

/**
 * 기기의 생체 인증 사용 가능 여부 확인
 * @returns {Promise<{ available: boolean, type: 'fingerprint' | 'face' | 'none' }>}
 */
export async function checkBiometricAvailability() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return { available: false, type: 'none' };
    }

    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFace = types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    );
    const hasFingerprint = types.includes(
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    );

    if (hasFace) {
      return { available: true, type: 'face' };
    }
    if (hasFingerprint) {
      return { available: true, type: 'fingerprint' };
    }

    return { available: true, type: 'fingerprint' };
  } catch {
    return { available: false, type: 'none' };
  }
}

/**
 * 생체 인증 실행
 * @param {string} promptMessage
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function authenticateWithBiometrics(promptMessage) {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'PIN 입력',
      cancelLabel: '취소',
      disableDeviceFallback: true,
    });

    if (result.success) {
      return { success: true };
    }

    return { success: false, error: result.error };
  } catch (error) {
    return {
      success: false,
      error: error?.message ?? 'unknown_error',
    };
  }
}

export function getBiometricIconName(type) {
  return type === 'face' ? 'scan' : 'finger-print';
}
