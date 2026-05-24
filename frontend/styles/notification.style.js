import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const createNotificationSkeletonStyles = (normalize) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      padding: normalize(16),
      alignItems: 'flex-start',
    },
    icon: {
      width: normalize(48),
      height: normalize(48),
      borderRadius: normalize(24),
      backgroundColor: colors.border,
      marginRight: normalize(12),
    },
    content: { flex: 1 },
    line: { backgroundColor: colors.border, borderRadius: normalize(4) },
    titleLine: {
      height: normalize(16),
      width: '60%',
      marginBottom: normalize(8),
    },
    textLine: {
      height: normalize(14),
      width: '90%',
      marginBottom: normalize(6),
    },
    timeLine: { height: normalize(12), width: '30%' },
  });

export const createNotificationStyles = (normalize) =>
  StyleSheet.create({
    rootWrapper: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabContainer: {
      backgroundColor: colors.background,
      paddingVertical: normalize(4),
    },
    tabContent: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      gap: normalize(8),
    },
    tabButton: {
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      borderRadius: normalize(20),
      backgroundColor: colors.textLight5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(5),
      position: 'relative',
    },
    tabButtonActive: {
      backgroundColor: colors.textPrimary,
    },
    tabText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },
    countBadge: {
      backgroundColor: colors.background,
      paddingHorizontal: normalize(6.5),
      paddingVertical: normalize(1),
      borderRadius: normalize(999),
      alignItems: 'center',
    },
    countBadgeActive: {
      backgroundColor: colors.background,
    },
    countText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    countTextActive: {
      color: colors.textSecondary,
      fontFamily: fonts.bold,
    },
    tabUnreadDot: {
      position: 'absolute',
      top: -normalize(2),
      right: -normalize(1),
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
      backgroundColor: colors.alert,
    },
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: normalize(24),
      flexGrow: 1,
    },
    notificationItem: {
      backgroundColor: colors.background,
      flexDirection: 'row',
      padding: normalize(18),
      alignItems: 'flex-start',
    },
    notificationItemUnread: {
      backgroundColor: colors.primaryLight10,
    },
    iconContainer: {
      borderRadius: normalize(24),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(12),
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    notificationText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: normalize(20),
    },
    notificationTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    summaryWatcherRow: {
      marginTop: normalize(8),
      paddingRight: normalize(8),
      gap: normalize(8),
    },
    summaryWatcherChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.green,
      borderRadius: normalize(999),
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(8),
      marginRight: normalize(8),
      maxWidth: normalize(140),
    },
    summaryWatcherAvatar: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(6),
    },
    summaryWatcherName: {
      fontSize: normalize(fontSizes.lg),
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },
    unreadDot: {
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
      backgroundColor: colors.primaryDark,
      marginLeft: normalize(8),
      marginTop: normalize(6),
    },
    skeletonContainer: {
      paddingTop: normalize(8),
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(24),
    },
    emptyTitle: {
      fontSize: normalize(fontSizes.heading - 2),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginTop: normalize(16),
    },
    emptyText: {
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textLight40,
      marginTop: normalize(8),
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: normalize(24),
      backgroundColor: colors.primaryDark,
      paddingVertical: normalize(14),
      paddingHorizontal: normalize(28),
      borderRadius: normalize(999),
    },
    emptyButtonText: {
      fontSize: normalize(fontSizes.xl + 1),
      fontFamily: fonts.bold,
      color: colors.textWhite,
    },
    footerLoader: {
      paddingVertical: normalize(16),
      alignItems: 'center',
    },
    footerLoaderText: {
      fontSize: normalize(fontSizes.lg + 1),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    emptyIcon: {
      color: colors.border,
      size: normalize(64),
    },
    notificationIcon: {
      size: normalize(22),
    },
    summaryWatcherProfileIcon: {
      width: normalize(12),
      height: normalize(12),
    },
    announcementListContainer: {
      paddingHorizontal: normalize(20),
      paddingTop: normalize(6),
      paddingBottom: normalize(24),
      gap: normalize(8),
    },
    announcementItem: {
      backgroundColor: colors.background,
      paddingVertical: normalize(10),
      borderBottomWidth: 1,
      borderColor: colors.textLight10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    announcementContent: {
      flex: 1,
      paddingRight: normalize(10),
    },
    announcementTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(4),
    },
    announcementMeta: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    announcementEmptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    announcementEmptyText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight20,
    },
  });
