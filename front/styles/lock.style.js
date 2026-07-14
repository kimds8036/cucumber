import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createLockStyles = (normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    logoWrap: {
      alignItems: 'center',
      paddingTop: normalize(80),
    },
    /** 로고 ↔ PIN 영역 사이 간격 (로고 블록 하단) */
    logoContainer: {
      alignItems: 'center',
    },
    /** PinInput content — logo↔PIN 간격 축소 (paddingTop만 pin.style 대비 override) */
    pinInputContent: {
      paddingTop: normalize(16),
    },
    /** SetPinScreen과 동일 — PinInput flex 1 래퍼 */
    pinArea: {
      flex: 1,
    },
    /** 키패드 7번 아래(좌하단) 생체 인증 아이콘 */
    biometricKeypadSlot: {
      flex: 1,
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockoutText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.alertDark,
      textAlign: 'center',
      marginTop: normalize(8),
      paddingHorizontal: normalize(24),
    },
  });

/** LockScreen 전용 PIN↔키패드 추가 간격 (PinInput keypadGap prop) */
export const getLockPinKeypadGap = (normalize) => normalize(60);
