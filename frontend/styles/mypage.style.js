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
      marginTop: normalize(16),
      marginBottom: normalize(8),
      padding: normalize(16),
      borderRadius: normalize(12),
      minHeight: normalize(88),
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
      backgroundColor: colors.textLight10,
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
    profileSkeletonBadge: {
      width: normalize(38),
      height: normalize(24),
      borderRadius: normalize(12),
      backgroundColor: colors.textLight10,
      marginLeft: normalize(8),
    },
  });
};

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
      height: normalize(80),
    },

    sectionHeader: {
      marginTop: normalize(24),
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
      paddingVertical: normalize(10),
    },
    pwInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
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

/** 내 활동 — 작성글 / 스크랩 탭 (`myposts.jsx`) */
export const createMyPostsStyles = (normalize) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    toggleWrapper: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(10),
      backgroundColor: colors.background,
    },
    toggleTrack: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: normalize(999),
      padding: 0,
      position: 'relative',
      height: normalize(38),
      borderWidth: 1,
      borderColor: colors.primary,
    },
    pill: {
      position: 'absolute',
      width: '50%',
      top: 0,
      bottom: 0,
      borderRadius: normalize(999),
      ...shadow.sm,
    },
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(4),
      zIndex: 1,
    },
    toggleText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.textLight40,
    },
    toggleTextActive: {
      color: colors.textWhite,
    },
    cnt: {
      backgroundColor: colors.textLight10,
      borderRadius: normalize(999),
      paddingHorizontal: normalize(5),
      paddingVertical: 0,
    },
    cntActive: {
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
    cntText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.textLight40,
    },
    cntTextActive: {
      color: colors.textWhite,
    },

    scroll: {
      flex: 1,
    },
    scrollBottomSpacer: {
      height: normalize(80),
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
