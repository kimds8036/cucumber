import { Platform, StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createLoginStyles = (width, normalize) => {
  return StyleSheet.create({
    // Login screen
    screen: {
      flex: 1,
      backgroundColor: colors.white,
    },
    body: {
      flex: 1,
      minHeight: 0,
    },
    bodyScroll: {
      flexGrow: 1,
      paddingHorizontal: normalize(28),
      paddingTop: normalize(80),
      paddingBottom: normalize(28),
    },
    screenTitle: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.bold,
      color: colors.text,
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
      color: colors.text,
      backgroundColor: colors.white,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false },
        ios: {},
      }),
    },
    underlineInputFocused: {},
    underlineGrowSlot: {
      marginTop: normalize(2),
      marginBottom: normalize(4),
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
      color: colors.white,
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
      backgroundColor: colors.textLight2,
    },
    socialDividerText: {
      marginHorizontal: normalize(12),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      backgroundColor: colors.text,
    },
    signupFooter: {
      marginTop: 'auto',
      paddingTop: normalize(40),
      alignItems: 'center',
    },
    signupFooterText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    signupFooterLink: {
      fontFamily: fonts.bold,
      color: colors.text,
    },

    container: {
      flex: 1,
      backgroundColor: colors.white,
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
      color: colors.textLight4,
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
      color: colors.textLight4,
      marginBottom: normalize(12),
      backgroundColor: colors.white,
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
      borderColor: colors.textLight4,
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
      color: colors.textLight4,
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
      color: colors.textLight4,
      marginHorizontal: normalize(8),
    },
    linkDivider: {
      fontSize: normalize(fontSizes.lg),
      color: colors.textLight4,
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
      backgroundColor: colors.white,
      paddingHorizontal: width * 0.04,
      ...debugBorder,
    },
    headerSection: {
      paddingTop: normalize(8),
      paddingBottom: normalize(4),
      backgroundColor: colors.white,
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
      paddingBottom: normalize(16),
      backgroundColor: colors.white,
      zIndex: 10,
      ...debugBorder,
    },

    // 헤더 영역
    header: {
      backgroundColor: colors.white,
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
      color: colors.text,
      textAlign: 'center',
      lineHeight: normalize(26),
    },

    // 진행바
    progressBarContainer: {
      width: '100%',
      height: normalize(6),
      backgroundColor: colors.textLight2,
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
      color: colors.textLight4,
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
      backgroundColor: colors.white,
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(18),
      ...Platform.select({
        android: { elevation: 0 },
        ios: shadow.sm,
      }),
    },
    ageGateCardSelected: {
      backgroundColor: colors.primaryLight3,
      borderColor: colors.primary,
    },
    ageGateCardTitle: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(6),
      lineHeight: normalize(26),
    },
    ageGateCardDescription: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.textLight2,
      lineHeight: normalize(45),
    },
    certificateGuideStepTitle: {
      flex: 1,
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.text,
      lineHeight: normalize(28),
    },
    certificateGuideStepDescription: {
      width: '100%',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.textLight4,
      textAlign: 'center',
    },
    nextButtonDisabled: {
      backgroundColor: colors.textLight2,
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
      color: colors.text,
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
      color: colors.text,
      backgroundColor: colors.textLight1,
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
      color: colors.text,
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
      color: colors.textLight4,
    },
    lockedFieldInner: {
      justifyContent: 'center',
      minHeight: normalize(48),
      paddingVertical: normalize(12),
    },
    lockedFieldText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    lockedFieldPlaceholder: {
      color: colors.textLight3,
    },
    enrollmentNotice: {
      width: '98%',
      alignSelf: 'center',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight5,
      lineHeight: normalize(20),
      marginTop: normalize(10),
      marginBottom: normalize(10),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(11),
      borderRadius: normalize(14),
      backgroundColor: colors.textLight1,
      overflow: 'hidden',
    },
    passGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      marginBottom: normalize(12),
      marginLeft: normalize(20),
    },
    fieldHelperText: {
      width: '98%',
      alignSelf: 'center',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight5,
      marginLeft: 0,
      marginTop: normalize(6),
      marginBottom: normalize(10),
      lineHeight: normalize(20),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(11),
      borderRadius: normalize(14),
      backgroundColor: colors.textLight1,
      overflow: 'hidden',
    },
    fieldHelperTextSuccess: {
      color: colors.primaryDark,
      backgroundColor: colors.primaryLight2,
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
      backgroundColor: colors.white,
      overflow: 'hidden',
      ...debugBorder,
    },
    nativePicker: {
      width: '100%',
      color: colors.text,
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
      backgroundColor: colors.white,
      ...shadow.sm,
    },
    dropdownText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    dropdownPlaceholder: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.white,
    },
    // 보호자 본인인증 전용 스타일 (Step1과 동일 톤)
    guardianInputLabel: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.text,
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
      color: colors.text,
      marginBottom: normalize(12),
      backgroundColor: colors.white,
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
      color: colors.white,
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
      backgroundColor: Platform.OS === 'android' ? 'transparent' : colors.text,
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
      backgroundColor: colors.textLight6,
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
      backgroundColor: colors.textLight6,
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
      backgroundColor: colors.textLight6,
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
      backgroundColor: colors.textLight6,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
    },
    cameraGuideText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.white,
      textAlign: 'center',
      marginTop: normalize(12),
    },

    // 직접 입력하기 버튼
    manualButton: {
      width: '100%',
      height: normalize(30),
      backgroundColor: colors.white,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: normalize(8),
      ...debugBorder,
    },
    manualButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textDecorationLine: 'underline',
    },

    // 하단 고정 버튼 컨테이너
    bottomButtonContainer: {
      paddingBottom: 0,
      backgroundColor: colors.white,
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
      color: colors.white,
    },

    // 모달 스타일
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.textLight4,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: width * 0.8,
      maxHeight: '60%',
      backgroundColor: colors.white,
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
      borderBottomColor: colors.textLight1,
    },
    modalTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    modalClose: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
    },
    modalItem: {
      paddingVertical: normalize(16),
      paddingHorizontal: normalize(20),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight1,
    },
    modalItemText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.text,
      textAlign: 'center',
    },
    modalItemTextSelected: {
      color: colors.primary,
      fontFamily: fonts.bold,
    },
  });
};
