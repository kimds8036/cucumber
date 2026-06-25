import { StyleSheet } from 'react-native';
import { colors, fonts, fontSizes } from './colors';
import { shadow } from './tokens';

export const createAdStyles = (normalize, width) => {
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const w = typeof width === 'number' ? width : 360;
  /** schoolMailbox 그리드 카드와 동일 너비 — MailboxAdPlaceholder */
  const mailboxCardWidth = (w * 0.92 - n(8)) / 2;

  return StyleSheet.create({
    // AdPlaceholder (board card style)
    postItem: {
      backgroundColor: colors.background,
      borderRadius: n(18),
      padding: n(14),
      marginBottom: n(12),
      ...shadow.md,
    },
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: n(5),
    },
    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      minWidth: 0,
    },
    postAuthor: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
    },
    postDot: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
      marginHorizontal: n(6),
    },
    postTime: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(18),
      textAlignVertical: 'center',
    },
    postBodyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    postBodyColumn: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'column',
    },
    postContent: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: n(20),
      marginTop: n(2),
      marginBottom: n(7),
    },
    postContentCompact: {
      marginTop: n(2),
      marginBottom: n(5),
    },
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(15),
      paddingLeft: n(2),
    },
    postStatText: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    tipTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: n(5),
    },
    tipTopSpacer: {
      flex: 1,
    },
    tipIcon: {
      fontSize: n(18),
      lineHeight: n(22),
      marginRight: n(8),
    },
    tipIconLarge: {
      fontSize: n(22),
      lineHeight: n(26),
    },
    tipBoardDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: n(12),
      gap: n(8),
      width: '100%',
    },
    tipBoardDetailText: {
      flex: 1,
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textWhite,
      lineHeight: n(18),
    },

    // boarddetailADplaceholder
    adSection: {
      minHeight: n(40),
      marginHorizontal: w * 0,
      backgroundColor: colors.primaryLight10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    adSectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: n(18),
      paddingVertical: n(12),
      gap: n(12),
      width: '100%',
    },
    adSectionBadge: {
      flexShrink: 0,
    },
    adSectionText: {
      flex: 1,
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },

    // ChatAdPlaceholder (message list style)
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: n(12),
      paddingHorizontal: n(8),
      backgroundColor: colors.background,
    },
    listItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    listItemBody: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    listItemName: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: n(2),
    },
    listItemContent: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: n(2),
    },
    listItemRight: {
      alignSelf: 'center',
      alignItems: 'flex-end',
      justifyContent: 'center',
      marginLeft: n(8),
      minWidth: n(48),
      flexShrink: 0,
    },

    // SchoolAdPlaceholder
    container: {
      backgroundColor: colors.background,
      borderRadius: n(16),
      paddingHorizontal: n(10),
      paddingVertical: n(20),
      marginBottom: n(10),
      ...shadow.md,
    },

    // MailboxAdPlaceholder — SchoolMail.style.js createSchoolMailStyles 카드 블록과 동일
    card: {
      width: mailboxCardWidth,
      minHeight: n(150),
      flexDirection: 'column',
      backgroundColor: colors.background,
      borderRadius: n(14),
      padding: n(12),
      marginBottom: n(10),
      ...shadow.md,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: n(8),
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    cardFromLabel: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    cardMetaDot: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginHorizontal: n(4),
    },
    cardPreview: {
      flexGrow: 1,
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: n(fontSizes.title),
      marginTop: n(4),
      marginBottom: n(10),
    },
    cardFooterRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: 'auto',
    },
    cardTime: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(6),
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: n(2),
    },
    statText: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },

    // SearchAdPlaceholder — result.style.js fullCard 행과 동일
    fullCard: {
      paddingHorizontal: n(18),
      paddingVertical: n(16),
      borderBottomWidth: 1,
      borderBottomColor: colors.textLight10,
    },
    contentTimeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: n(8),
    },
    snippetWrap: {
      flex: 1,
    },
    fullSnippet: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(19),
      marginTop: n(2),
    },
    metaTimeInline: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.background2,
    },

    // NotificationAdPlaceholder — notification.style.js 알림 행과 동일
    notificationItem: {
      backgroundColor: colors.background,
      flexDirection: 'row',
      padding: n(18),
      alignItems: 'flex-start',
    },
    notificationItemUnread: {
      backgroundColor: colors.primaryLight10,
    },
    iconContainer: {
      borderRadius: n(24),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: n(12),
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: n(4),
    },
    notificationTitleSlot: {
      alignSelf: 'flex-start',
      marginBottom: n(4),
    },
    notificationText: {
      fontSize: n(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: n(20),
      marginTop: n(2),
    },
    notificationTime: {
      fontSize: n(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight40,
    },
    notificationIcon: {
      size: n(22),
    },
    unreadDot: {
      width: n(8),
      height: n(8),
      borderRadius: n(4),
      backgroundColor: colors.primaryDark,
      marginLeft: n(8),
      marginTop: n(6),
    },
  });
};
