import { Platform, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
check
export const createLoginStyles = (width, normalize) => {
  return StyleSheet.create({
    // —— 로그인 화면 ——
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      flex: 1,
      minHeight: 0,
    },
    bodyScroll: {
      flexGrow: 1,
      paddingHorizontal: width * 0.07,
      paddingHorizontal: normalize(28),
      paddingTop: normalize(80),
      paddingBottom: normalize(28),
    },
    screenTitle: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(28),
    },
    underlineInputContainer: {
      width: '100%',
      marginBottom: normalize(4),
    },
    underlineInput: {
      width: '100%',
      minHeight: normalize(48),
      paddingHorizontal: 0,
      paddingVertical: normalize(12),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      borderBottomWidth: normalize(1),
      borderBottomColor: colors.textLight20,
      backgroundColor: colors.background,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false },
        ios: {},
      }),
    },
    underlineInputFocused: {
      borderBottomColor: colors.textPrimary,
    },
    underlineInputSpaced: {
      marginTop: normalize(10),
    },
    loginButton: {
      width: '100%',
      height: normalize(52),
      backgroundColor: colors.primary,
      borderRadius: normalize(26),
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: normalize(28),
    },
    loginButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    findLinkContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: normalize(18),
    },
    socialDividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: normalize(40),
      marginBottom: normalize(22),
    },
    socialDividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.textLight20,
    },
    socialDividerText: {
      marginHorizontal: normalize(12),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    socialRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: normalize(20),
    },
    socialCircleButton: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(26),
      alignItems: 'center',
      justifyContent: 'center',
    },
    kakaoCircleButton: {
      backgroundColor: '#FEE500',
    },
    appleCircleButton: {
      backgroundColor: colors.textPrimary,
    },
    signupFooter: {
      marginTop: 'auto',
      paddingTop: normalize(40),
      alignItems: 'center',
    },
    signupFooterText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    signupFooterLink: {
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },

    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: width * 0.08,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: normalize(20),
    },
    logo: {
      width: normalize(100),
      height: normalize(100),
      marginBottom: normalize(10),
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: normalize(20),
    },
    titleLarge: {
      fontSize: normalize(fontSizes.heading + 4),
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
      alignItems: 'center',
    },
    input: {
      width: '95%',
      minHeight: normalize(50),
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(12),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false, elevation: 0 },
        ios: shadow.sm,
      }),
    },
    checkboxContainer: {
      width: '90%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
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
      paddingHorizontal: width * 0.04,
      ...debugBorder,
    },
    headerSection: {
      paddingTop: normalize(8),
      paddingBottom: normalize(4),
      backgroundColor: colors.background,
      zIndex: 10,
      ...debugBorder,
    },
    contentSection: {
      flex: 1,
      minHeight: 0,
      paddingTop: normalize(16),
      ...debugBorder,
    },
    footerSection: {
      paddingTop: normalize(8),
      paddingBottom: normalize(8),
      paddingHorizontal: normalize(20),
      backgroundColor: colors.background,
      zIndex: 10,
      ...debugBorder,
    },
    primaryButton: {
      width: '100%',
      height: normalize(52),
      borderRadius: normalize(26),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textWhite,
    },
    primaryButtonTextDisabled: {
      color: colors.textSecondary,
    },

    // 헤더 영역
    header: {
      backgroundColor: colors.background,
      ...debugBorder,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: normalize(30),
      position: 'relative',
      paddingHorizontal: normalize(40),
      ...debugBorder,
    },
    backButton: {
      position: 'absolute',
      left: -normalize(4),
      padding: normalize(8),
    },
    headerTitle: {
      width: '100%',
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: normalize(26),
    },

    // 진행바
    progressBarContainer: {
      width: '100%',
      height: normalize(6),
      backgroundColor: colors.textLight20,
      borderRadius: normalize(999),
      overflow: 'hidden',
      marginTop: normalize(12),
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
      minHeight: 0,
      ...debugBorder,
    },
    description: {
      width: '98%',
      alignSelf: 'center',
      paddingHorizontal: normalize(8),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(Math.round(fontSizes.xl * 1.45)),
      textAlign: 'center',
      marginTop: normalize(6),
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
      ...Platform.select({
        android: { elevation: 0 },
        ios: shadow.sm,
      }),
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
      lineHeight: normalize(26),
    },
    ageGateCardDescription: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(22),
    },

    // 재학증명서 가이드
    certificateGuideContainer: {
      overflow: 'hidden',
    },
    certificateGuideScroll: {
      flex: 1,
    },
    certificateGuideScrollContent: {
      paddingHorizontal: normalize(10),
      paddingBottom: normalize(24),
    },
    certificateGuideStepBlock: {
      marginBottom: normalize(10),
      alignItems: 'center',
    },
    certificateGuideStepHeader: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(10),
    },
    certificateGuideStepNumber: {
      fontSize: normalize(fontSizes.guideStepNumber),
      fontFamily: fonts.regular,
      color: colors.background2,
      lineHeight: normalize(45),
    },
    certificateGuideStepTitle: {
      flex: 1,
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      lineHeight: normalize(28),
    },
    certificateGuideStepDescription: {
      width: '100%',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(22),
      marginBottom: normalize(10),
    },
    certificateGuideStepDescriptionBold: {
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    certificateGuideStepImage: {
      width: width * 0.68,
      height: width * 0.68 * 1.85,
    },
    certificateGuideButtonSection: {
      width: '100%',
      alignItems: 'center',
      paddingTop: normalize(8),
      gap: normalize(12),
    },
    certificateGuideScrollHint: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    nextButtonDisabled: {
      backgroundColor: colors.textLight20,
    },

    // 재학증명서 제출 입력
    certificateSubmitContainer: {
      flex: 1,
      minHeight: 0,
    },
    certificateSubmitLabelSpaced: {
      marginTop: normalize(8),
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
      ...debugBorder,
    },
    input: {
      width: '98%',
      minHeight: normalize(48),
      borderRadius: normalize(24),
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(12),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      backgroundColor: colors.textLight5,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false, elevation: 0 },
        ios: shadow.sm,
      }),
    },
    /** SignStep2 — 라벨 위 간격 */
    inputLabelSpaced: {
      marginTop: normalize(12),
    },
    /** SignStep2 — 비밀번호 입력 + 눈 아이콘 행 */
    passwordInputFrame: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    passwordInput: {
      flex: 1,
      alignSelf: 'stretch',
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false },
        ios: {},
      }),
    },
    passwordConfirmMatch: {
      borderColor: colors.primaryDark,
      borderWidth: 1.5,
    },
    passwordConfirmMismatch: {
      borderColor: colors.alert,
      borderWidth: 1.5,
    },
    stepFlex: {
      flex: 1,
    },
    /** @deprecated 회원가입 잠금 필드는 lockedFieldText 사용 */
    inputReadonly: {
      color: colors.textSecondary,
    },
    lockedFieldInner: {
      justifyContent: 'center',
      minHeight: normalize(48),
      paddingVertical: normalize(12),
    },
    lockedFieldText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    lockedFieldPlaceholder: {
      color: colors.textLight40,
    },
    enrollmentNotice: {
      width: '98%',
      alignSelf: 'center',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight70,
      lineHeight: normalize(20),
      marginTop: normalize(10),
      marginBottom: normalize(10),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(11),
      borderRadius: normalize(14),
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    passGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(12),
      marginLeft: normalize(20),
    },
    fieldHelperText: {
      width: '98%',
      alignSelf: 'center',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight70,
      marginLeft: 0,
      marginTop: normalize(6),
      marginBottom: normalize(10),
      lineHeight: normalize(20),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(11),
      borderRadius: normalize(14),
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    fieldHelperTextSuccess: {
      color: colors.primaryDark,
      backgroundColor: colors.primaryLight10,
    },
    fieldHelperTextError: {
      color: colors.alertDark,
      backgroundColor: colors.alertLight,
    },
    inputRow: {
      width: '98%',
      alignSelf: 'center',
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
      width: '100%',
      marginBottom: normalize(4),
      ...debugBorder,
    },
    inputFlex: {
      flex: 1,
      marginBottom: 0,
      marginRight: normalize(8),
      marginLeft: 0,
    },
    verifyButton: {
      paddingHorizontal: normalize(20),
      minHeight: normalize(48),
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
      minHeight: normalize(50),
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: normalize(24),
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(12),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(12),
      backgroundColor: colors.background,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false, elevation: 0 },
        ios: shadow.sm,
      }),
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
      minHeight: normalize(50),
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

    // 카메라 영역 (학생증 OCR) — preview zIndex:0 / guide zIndex:1, elevation 0 (Android)
    cameraContainer: {
      flex: 1,
      minHeight: normalize(280),
      marginBottom: normalize(12),
      backgroundColor: 'transparent',
      ...debugBorder,
    },
    cameraStage: {
      flex: 1,
      minHeight: normalize(280),
      position: 'relative',
      borderRadius: normalize(24),
      overflow: 'hidden',
      backgroundColor: Platform.OS === 'android' ? 'transparent' : '#000',
      ...Platform.select({
        android: { elevation: 0 },
        default: {},
      }),
      ...debugBorder,
    },
    cameraStageStack: {
      flex: 1,
      width: '100%',
      position: 'relative',
      backgroundColor: 'transparent',
      overflow: 'hidden',
      ...Platform.select({
        android: { elevation: 0 },
        default: {},
      }),
      ...debugBorder,
    },
    cameraPreview: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 0,
      backgroundColor: 'transparent',
      ...Platform.select({
        android: { elevation: 0 },
        default: {},
      }),
      ...debugBorder,
    },
    cameraGuideOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      zIndex: 1,
      backgroundColor: 'transparent',
      ...Platform.select({
        android: { elevation: 0 },
        default: {},
      }),
      ...debugBorder,
    },
    /** StudentIdCameraGuideOverlay 딤 4조각 — overlayDark 고정 (루트 transparent 와 분리) */
    cameraGuideDim: {
      position: 'absolute',
      elevation: 0,
      backgroundColor: colors.overlayDark,
      ...debugBorder,
    },
    camera: {
      flex: 1,
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: 'transparent',
      ...debugBorder,
    },
    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
      elevation: 0,
      backgroundColor: 'transparent',
      ...debugBorder,
    },
    overlayTop: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.overlayDark,
    },
    overlayMiddle: {
      flexDirection: 'row',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlaySide: {
      flex: 1,
      alignSelf: 'stretch',
      backgroundColor: colors.overlayDark,
    },
    cardFrame: {
      width: width * 0.8,
      height: width * 0.5,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(16),
      backgroundColor: 'transparent',
    },
    overlayBottom: {
      flex: 1,
      width: '100%',
      backgroundColor: colors.overlayDark,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
    },
    cameraGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.background,
      textAlign: 'center',
      marginTop: normalize(12),
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
