import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createMyPageStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // MainHeader 본문 상단: 게시판 탭 `BoardAllContent`의 `sortContainer` paddingTop 과 동일
    scrollView: {
      flex: 1,
      paddingTop: normalize(8),
    },
    menuSection: {
      marginHorizontal: normalize(16),
      marginTop: normalize(8),
      marginBottom: normalize(16),
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(18),
      backgroundColor: colors.background,
      borderRadius: normalize(999),
      marginBottom: normalize(10),
      ...shadow.md,
    },
    menuLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      marginRight: normalize(12),
    },
    menuTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      fontWeight: '500',
    },
    menuSubtitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: normalize(2),
    },
    bottomPadding: {
      height: normalize(80),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '80%',
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(20),
    },
    modalTitle: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(16),
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: normalize(8),
      padding: normalize(12),
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      marginBottom: normalize(16),
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      paddingVertical: normalize(12),
      borderRadius: normalize(8),
      alignItems: 'center',
      marginHorizontal: normalize(4),
    },
    cancelButton: {
      backgroundColor: colors.textLight5,
    },
    deleteButton: {
      backgroundColor: colors.alert,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    cancelButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    deleteButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
      fontWeight: '600',
    },
    confirmButtonText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.bold,
      color: colors.textWhite,
      fontWeight: '600',
    },
    ttSkeletonCard: {
      marginHorizontal: normalize(16),
      marginBottom: normalize(8),
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      padding: normalize(16),
      minHeight: normalize(260),
      ...shadow.md,
    },
    ttSkeletonHeader: {
      width: normalize(100),
      height: normalize(14),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight10,
      marginBottom: normalize(12),
    },
    ttSkeletonRow: {
      flexDirection: 'row',
      marginBottom: normalize(8),
      gap: normalize(6),
    },
    ttSkeletonCellSmall: {
      width: normalize(22),
      height: normalize(24),
      borderRadius: normalize(4),
      backgroundColor: colors.textLight10,
    },
    ttSkeletonCell: {
      flex: 1,
      height: normalize(24),
      borderRadius: normalize(4),
      backgroundColor: colors.textLight10,
    },
    ttSkeletonText: {
      marginTop: normalize(8),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    profileSkeletonCard: {
      backgroundColor: colors.background,
      marginHorizontal: normalize(16),
      marginTop: 0,
      marginBottom: normalize(8),
      padding: normalize(16),
      borderRadius: normalize(16),
      minHeight: normalize(180),
      ...shadow.md,
    },
    profileSkeletonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    profileSkeletonAvatar: {
      width: normalize(56),
      height: normalize(56),
      borderRadius: normalize(28),
      marginRight: normalize(12),
    },
    profileSkeletonInfo: {
      flex: 1,
      gap: normalize(6),
    },
    profileSkeletonName: {
      width: normalize(120),
      height: normalize(14),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10,
    },
    profileSkeletonUsername: {
      width: normalize(90),
      height: normalize(10),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10,
    },
    profileSkeletonSchool: {
      width: normalize(150),
      height: normalize(10),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10,
    },
    profileSkeletonQuickRow: {
      flexDirection: 'row',
      marginTop: normalize(14),
      gap: normalize(8),
    },
    profileSkeletonQuickCell: {
      flex: 1,
      height: normalize(76),
      borderRadius: normalize(12),
      backgroundColor: colors.textLight10,
    },
  });
};

/** 마이페이지 학생 정보 카드 + 하단 바로가기 (`Profilecard.jsx`) */
export const createProfileCardStyles = (normalize) =>
  StyleSheet.create({
    profileCard: {
      backgroundColor: colors.background,
      marginHorizontal: normalize(16),
      marginTop: 0,
      marginBottom: normalize(8),
      padding: normalize(16),
      borderRadius: normalize(16),
      borderWidth: 2,
      borderColor: colors.primary,
      ...shadow.md,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    profileCircle: {
      width: normalize(70),
      height: normalize(70),
      borderRadius: normalize(28),
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: normalize(12),
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: normalize(fontSizes.title),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    profileUsername: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    profileSchool: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
    },
    profileDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      alignSelf: 'flex-start',
      width: '95%',
      marginVertical: normalize(4),
    },
    quickLinksRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: normalize(20),
    },
    quickLinkCard: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      position: 'relative',
      paddingTop: normalize(8),
    },
    quickLinkLabel: {
      alignSelf: 'stretch',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    quickLinkMeta: {
      alignSelf: 'stretch',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    quickLinkInlineRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(4),
    },
    quickLinkLabelInline: {
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(fontSizes.xl + 2),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      includeFontPadding: false,
    },
    quickLinkMetaInline: {
      fontSize: normalize(fontSizes.xl),
      lineHeight: normalize(fontSizes.xl + 2),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      includeFontPadding: false,
    },
    quickLinkDot: {
      position: 'absolute',
      top: normalize(6),
      right: normalize(6),
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
      backgroundColor: colors.alert,
    },
    /** 숫자·라벨 줄 높이를 실제 `quickLinkMeta` / `quickLinkLabel`에 맞춤 */
    quickLinkSkeletonMeta: {
      alignSelf: 'center',
      width: '48%',
      height: normalize(24),
      borderRadius: normalize(6),
      backgroundColor: colors.primaryLight30,
    },
    quickLinkSkeletonLabel: {
      alignSelf: 'center',
      width: '64%',
      height: normalize(15),
      borderRadius: normalize(4),
      backgroundColor: colors.primaryLight30,
    },
    timetableActionRow: {
      flexDirection: 'row',
      marginTop: normalize(16),
    },
    timetableActionCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      paddingVertical: normalize(6),
      marginHorizontal: normalize(50),
      borderwidth: 2,
      borderColor: colors.primary,
      borderRadius: normalize(999),
      backgroundColor: colors.primary,
    },
    timetableActionMeta: {
      alignSelf: 'stretch',
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.background,
      textAlign: 'center',
    },
    timetableActionLabel: {
      alignSelf: 'stretch',
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

/** 알림/설정 화면 (`notificationsettings.jsx`) */
export const createNotificationSettingsStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollBottomSpacer: {
      height: normalize(60),
    },

    sectionHeader: {
      marginTop: normalize(16),
      marginBottom: normalize(8),
      marginHorizontal: normalize(20),
    },
    sectionHeaderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
    },
    sectionHeaderText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.primary,
      letterSpacing: 0.3,
    },
    sectionHeaderDescription: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
      marginTop: normalize(3),
      marginLeft: normalize(3),
      lineHeight: normalize(fontSizes.lg + 5),
    },

    card: {
      marginHorizontal: normalize(16),
      backgroundColor: colors.background,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(18),
      ...shadow.md,
    },

    notifRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: normalize(10),
    },
    notifRowDisabled: {
      opacity: 0.4,
    },
    notifLeft: {
      flex: 1,
      marginRight: normalize(12),
    },
    notifTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    notifTitleBold: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    notifSwitchWrap: {
      transform: [{ scaleX: 0.78 }, { scaleY: 0.78 }],
    },
    notifSubtitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: normalize(2),
    },
    textDisabled: {
      color: colors.textLight20,
    },

    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginBottom: normalize(4),
    },
    innerDivider: {
      height: 1,
      backgroundColor: colors.textLight5,
    },

    sliderWrapper: {
      height: normalize(20),
      justifyContent: 'center',
      marginTop: normalize(12),
      marginBottom: normalize(8),
    },
    sliderTrack: {
      height: normalize(4),
      borderRadius: normalize(2),
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    sliderFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: normalize(2),
    },
    sliderThumb: {
      position: 'absolute',
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      backgroundColor: colors.textWhite,
      marginLeft: normalize(-9),
      top: normalize(1),
      borderWidth: 2,
      borderColor: colors.primary,
      ...shadow.sm,
    },
    distanceValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(16),
    },
    distanceValueText: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.bold,
      color: colors.primary,
    },
    distanceHintRow: {
      flexDirection: 'row',
      gap: normalize(24),
    },
    distanceHint: {
      fontSize: normalize(fontSizes.md + 1),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    pwField: {
      paddingVertical: normalize(14),
    },
    /** 비밀번호 변경 카드: 블록 사이만 촘촘히 */
    pwFieldFirst: {
      paddingTop: normalize(14),
      paddingBottom: normalize(4),
    },
    pwFieldMiddle: {
      paddingTop: normalize(4),
      paddingBottom: normalize(4),
    },
    pwFieldLast: {
      paddingTop: normalize(4),
      paddingBottom: normalize(14),
    },
    pwLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(6),
      fontWeight: '500',
    },
    pwInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(12),
      height: normalize(44),
    },
    pwInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      paddingVertical: normalize(2),
      textAlignVertical: 'center',
    },

    /** 아이디 변경: 두 블록 사이만 촘촘히 (첫 블록 하단 / 둘째 블록 상단만 축소) */
    idFieldFirst: {
      paddingTop: normalize(14),
      paddingBottom: normalize(4),
    },
    idFieldSecond: {
      paddingTop: normalize(4),
      paddingBottom: normalize(14),
    },
    idNextDate: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primary,
      marginTop: normalize(8),
      marginBottom: normalize(8),
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },

    schoolRow: {
      paddingVertical: normalize(14),
    },
    schoolInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: normalize(8),
      backgroundColor: colors.green,
      borderRadius: normalize(10),
      padding: normalize(12),
    },
    schoolDesc: {
      flex: 1,
      fontSize: normalize(fontSizes.xl - 1),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(fontSizes.xl + 5),
    },
    schoolButton: {
      flexDirection: 'row',
    },
    schoolButtonIcon: {
      marginRight: normalize(6),
    },

    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: normalize(999),
      paddingVertical: normalize(10),
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: normalize(4),
      marginBottom: normalize(16),
    },
    actionButtonText: {
      color: colors.textWhite,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
    },
  });
};

/** 스크랩한 글 목록 (`scrapedposts.jsx`) */
export const createScrapedPostsStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      paddingTop: normalize(8),
    },
    postItem: {
      padding: normalize(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    postTitle: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      fontWeight: '500',
      marginBottom: normalize(8),
    },
    postInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    postAuthor: {
      fontSize: normalize(fontSizes.xl - 1),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginRight: normalize(8),
    },
    postDate: {
      fontSize: normalize(fontSizes.xl - 1),
      fontFamily: fonts.regular,
      color: colors.textLight20,
      flex: 1,
    },
    scrapInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: normalize(80),
      gap: normalize(12),
    },
    emptyText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight20,
      fontWeight: '500',
    },
  });
};

/** 내 활동 — 작성글 또는 스크랩 목록 (`myposts.jsx`, `tab` 라우트 파라미터로 구분) */
export const createMyPostsStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: normalize(16),
    },
    scrollBottomSpacer: {
      height: normalize(40),
    },
    list: {
      marginHorizontal: normalize(16),
      gap: normalize(10),
    },
    postItem: {
      backgroundColor: colors.background,
      borderRadius: normalize(14),
      padding: normalize(16),
      ...shadow.md,
    },
    postTitle: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      fontWeight: '500',
      lineHeight: normalize(21),
      marginBottom: normalize(10),
    },
    postBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postDate: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight20,
    },
    stats: {
      flexDirection: 'row',
      gap: normalize(12),
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    statText: {
      fontSize: normalize(fontSizes.xl - 1),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    myPostSkeletonItemGap: {
      marginBottom: normalize(10),
    },
    myPostSkeletonTitleLine1: {
      width: '92%',
      height: normalize(16),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10,
      marginBottom: normalize(8),
    },
    myPostSkeletonTitleLine2: {
      width: '66%',
      height: normalize(16),
      borderRadius: normalize(6),
      backgroundColor: colors.textLight10,
      marginBottom: normalize(12),
    },
    myPostSkeletonDate: {
      width: normalize(86),
      height: normalize(12),
      borderRadius: normalize(4),
      backgroundColor: colors.textLight10,
    },
    myPostSkeletonIcon: {
      width: normalize(14),
      height: normalize(14),
      borderRadius: normalize(7),
      backgroundColor: colors.textLight10,
    },
    myPostSkeletonCount: {
      width: normalize(16),
      height: normalize(12),
      borderRadius: normalize(4),
      backgroundColor: colors.textLight10,
    },

    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: normalize(80),
      gap: normalize(12),
    },
    emptyText: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.regular,
      color: colors.textLight20,
      fontWeight: '500',
    },
  });
};

/**
 * TextInput 전용 — RN StyleSheet에 없는 속성이지만 글자색은 전부 `colors.js` 토큰만 사용합니다.
 * 마이페이지·알림 설정 등 이 파일 스타일을 쓰는 화면에서 `{...themedTextInputProps}` 로 넘기세요.
 */
export const themedTextInputProps = {
  placeholderTextColor: colors.textLight20,
  selectionColor: colors.primary,
};
