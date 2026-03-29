import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

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
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
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
  return StyleSheet.create({
    // 공통 컨테이너
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: width * 0.08,
    },

    // 헤더 영역
    header: {
      paddingTop: normalize(10),
      backgroundColor: colors.background,
      zIndex: 10,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: normalize(30),
      marginBottom: normalize(16),
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: -5,
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
      borderRadius: normalize(3),
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: normalize(3),
    },

    // 컨텐츠 영역
    content: {
      flex: 1,
    },
    description: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      paddingTop: normalize(10),
      marginBottom: normalize(20),
      textAlign: 'center',
    },

    // 입력 필드
    inputLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(8),
      marginLeft: normalize(20),
    },
    inputWrapper: {
      width: '100%',
      alignItems: 'center',
      marginBottom: normalize(4),
    },
    input: {
      width: '98%',
      height: normalize(50),
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(20),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },

    // 생년월일 드롭다운
    birthdayContainer: {
      marginBottom: normalize(16),
    },
    dropdownRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dropdownButton: {
      width: '30%',
      height: normalize(50),
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(10),
      marginHorizontal: normalize(6),
      marginBottom: normalize(50),
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
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
    },
    inputFlex: {
      flex: 1,
      marginBottom: 0,
      marginRight: normalize(8),
      marginLeft: normalize(2),
    },
    verifyButton: {
      paddingHorizontal: normalize(20),
      height: normalize(50),
      backgroundColor: colors.primary,
      borderRadius: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    verifyButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.background,
    },

    // 카메라 영역 (3단계)
    cameraContainer: {
      flex: 1,
      marginBottom: normalize(20),
    },
    camera: {
      flex: 1,
      borderRadius: normalize(20),
      overflow: 'hidden',
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
      borderRadius: normalize(20),
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
      marginBottom: normalize(10),
    },
    manualButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },

    // 하단 고정 버튼 컨테이너
    bottomButtonContainer: {
      paddingBottom: normalize(20),
      backgroundColor: colors.background,
      zIndex: 10,
    },

    // 다음 버튼
    nextButtonWrapper: {
      width: '100%',
      alignItems: 'center',
      paddingTop: normalize(10),
      paddingBottom: normalize(20),
    },
    nextButton: {
      width: '98%',
      height: normalize(50),
      backgroundColor: colors.primary,
      borderRadius: normalize(20),
      justifyContent: 'center',
      alignItems: 'center',
    },
    nextButtonText: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.background,
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
      borderRadius: normalize(20),
      padding: normalize(20),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(20),
      paddingBottom: normalize(15),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    modalTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    modalClose: {
      fontSize: normalize(fontSizes.heading + 6),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    modalItem: {
      paddingVertical: normalize(15),
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
