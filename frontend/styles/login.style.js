import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createLoginStyles = (width, normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: width * 0.08,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: normalize(60),
    },
    logo: {
      width: normalize(140),
      height: normalize(140),
      marginBottom: normalize(20),
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    titleLarge: {
      fontSize: normalize(fontSizes.heading + 6),
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    titleSmall: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    inputContainer: {
      width: '100%',
      marginBottom: normalize(10),
      alignItems: 'center',
    },
    input: {
      width: '95%',
      height: normalize(50),
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(20),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      ...shadow.sm,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(30),
    },
    checkbox: {
      width: normalize(18),
      height: normalize(18),
      borderWidth: 2,
      borderColor: colors.textSecondary,
      borderRadius: normalize(4),
      marginRight: normalize(8),
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkboxText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: 'Baloo2-Regular',
      color: colors.textSecondary,
    },
    linkContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'baseline',
      marginTop: normalize(20),
    },
    linkText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: 'Baloo2-Regular',
      color: colors.textSecondary,
      marginHorizontal: normalize(8),
    },
    linkDivider: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
    },
  });
};

export const createSignupStyles = (width, normalize) => {
  // TODO: 레이아웃 확인용 경계선. 확인 후 제거하세요.
  const debugBorder = {
    borderWidth: 0,
    borderColor: 'transparent',
  };

  return StyleSheet.create({
    // 공통 컨테이너
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: width * 0.08,
      ...debugBorder,
    },
    headerSection: {
      paddingTop: normalize(8),
      backgroundColor: colors.background,
      zIndex: 10,
      ...debugBorder,
    },
    contentSection: {
      flex: 1,
      paddingTop: normalize(16),
      ...debugBorder,
    },
    footerSection: {
      paddingTop: normalize(8),
      paddingBottom: normalize(16),
      backgroundColor: colors.background,
      zIndex: 10,
      ...debugBorder,
    },

    // 헤더 영역
    header: {
      gap: normalize(12),
      backgroundColor: colors.background,
      ...debugBorder,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: normalize(30),
      position: 'relative',
      ...debugBorder,
    },
    backButton: {
      position: 'absolute',
      left: -normalize(4),
      padding: normalize(8),
    },
    headerTitle: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },

    // 진행바
    progressBarContainer: {
      width: '100%',
      height: normalize(6),
      backgroundColor: colors.textLight20,
      borderRadius: normalize(999),
      overflow: 'hidden',
      ...debugBorder,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: normalize(999),
    },

    // 컨텐츠 영역
    content: {
      flex: 1,
      ...debugBorder,
    },
    description: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: normalize(8),
      ...debugBorder,
    },
    ageGateContainer: {
      flex: 1,
      justifyContent: 'flex-start',
      gap: normalize(12),
      ...debugBorder,
    },
    ageGateCard: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      backgroundColor: colors.background,
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(18),
      ...shadow.sm,
    },
    ageGateCardSelected: {
      backgroundColor: colors.primaryLight20,
      borderColor: colors.primary,
    },
    ageGateCardTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(6),
    },
    ageGateCardDescription: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
    },
    // 입력 필드
    inputLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(8),
      marginLeft: normalize(20),
      ...debugBorder,
    },
    inputWrapper: {
      width: '100%',
      alignItems: 'center',
      marginBottom: normalize(8),
      ...debugBorder,
    },
    input: {
      width: '98%',
      height: normalize(50),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      paddingHorizontal: normalize(20),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      ...shadow.sm ,
    },
    inputReadonly: {
      backgroundColor: colors.textLight5,
      color: colors.textSecondary,
    },
    passGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(12),
      marginLeft: normalize(20),
    },

    // 생년월일 드롭다운
    birthdayContainer: {
      marginBottom: normalize(16),
    },
    dropdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: normalize(8),
      ...debugBorder,
    },
    nativePickerContainer: {
      flex: 1,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(12),
      backgroundColor: colors.background,
      overflow: 'hidden',
      ...debugBorder,
    },
    nativePicker: {
      width: '100%',
      color: colors.textPrimary,
    },
    dropdownButton: {
      width: '30%',
      height: normalize(50),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      paddingHorizontal: normalize(12),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      ...shadow.sm,
    },
    dropdownText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    dropdownPlaceholder: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // 인증 버튼 (전화번호 옆)
    inputWithButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(16),
      ...debugBorder,
    },
    inputFlex: {
      flex: 1,
      marginBottom: 0,
      marginRight: normalize(8),
      marginLeft: normalize(4),
    },
    verifyButton: {
      paddingHorizontal: normalize(20),
      height: normalize(50),
      backgroundColor: colors.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
      ...debugBorder,
    },
    verifyButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background,
    },
    // 보호자 본인인증 전용 스타일 (Step1과 동일 톤)
    guardianInputLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(8),
      marginLeft: normalize(20),
    },
    guardianInputWrapper: {
      width: '100%',
      alignItems: 'center',
      marginBottom: normalize(8),
    },
    guardianInput: {
      width: '98%',
      height: normalize(50),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      paddingHorizontal: normalize(20),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      ...shadow.sm,
    },
    guardianInputWithButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: normalize(16),
    },
    guardianInputFlex: {
      flex: 1,
      marginBottom: 0,
      marginRight: normalize(8),
      marginLeft: normalize(4),
    },
    guardianVerifyButton: {
      paddingHorizontal: normalize(20),
      height: normalize(50),
      backgroundColor: colors.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
    },
    guardianVerifyButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background,
    },

    // 카메라 영역 (3단계)
    cameraContainer: {
      flex: 1,
      marginBottom: normalize(20),
      ...debugBorder,
    },
    camera: {
      flex: 1,
      borderRadius: normalize(24),
      overflow: 'hidden',
      ...debugBorder,
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    overlayTop: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.overlayDark,
    },
    overlayMiddle: {
      flexDirection: 'row',
      width: '100%',
    },
    overlaySide: {
      flex: 1,
      backgroundColor: colors.overlayDark,
    },
    cardFrame: {
      width: width * 0.7,
      height: width * 0.45,
      borderWidth: 3,
      borderColor: colors.primary,
      borderRadius: normalize(24),
    },
    overlayBottom: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.overlayDark,
      justifyContent: 'center',
      alignItems: 'center',
    },
    cameraGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.background,
      marginTop: normalize(20),
    },

    // 직접 입력하기 버튼
    manualButton: {
      width: '100%',
      height: normalize(30),
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: normalize(8),
      ...debugBorder,
    },
    manualButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },

    // 하단 고정 버튼 컨테이너
    bottomButtonContainer: {
      paddingBottom: 0,
      backgroundColor: colors.background,
      ...debugBorder,
    },

    // 다음 버튼
    nextButtonWrapper: {
      width: '100%',
      alignItems: 'center',
      paddingTop: 0,
      paddingBottom: 0,
      ...debugBorder,
    },
    nextButton: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: normalize(24),
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: normalize(14),
      ...debugBorder,
    },
    nextButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },

    // 모달 스타일
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: width * 0.8,
      maxHeight: '60%',
      backgroundColor: colors.background,
      borderRadius: normalize(24),
      padding: normalize(20),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(20),
      paddingBottom: normalize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    modalTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    modalClose: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    modalItem: {
      paddingVertical: normalize(16),
      paddingHorizontal: normalize(20),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight5,
    },
    modalItemText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    modalItemTextSelected: {
      color: colors.primary,
      fontFamily: fonts.bold,
    },
  });
};
