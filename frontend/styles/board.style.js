import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

export const createBoardStyles = (width, normalize) => {
  const metaLineHeight = normalize(18);
  const metaTextAndroid =
    Platform.OS === 'android' ? { includeFontPadding: false } : {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // 정렬 버튼 영역
    sortContainer: {
      flexDirection: 'row',
      paddingHorizontal: width * 0.05,
      paddingVertical: normalize(10),
      gap: normalize(8),
    },
    sortButton: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(8),
      borderRadius: normalize(20),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.textLight10,
    },
    sortButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    sortButtonTextActive: {
      color: colors.background,
      fontFamily: fonts.bold,
    },

    // 게시글 목록
    postList: {
      flex: 1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(5),
    },
    postItem: {
      backgroundColor: colors.background,
      borderRadius: normalize(20),
      padding: normalize(16),
      marginBottom: normalize(12),
      shadowColor: colors.shadow,
      shadowOffset: { width: 1, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },

    // 게시글 헤더 (좌: 작성자•시간[·위치], 우: 거리 배지 등)
    postHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(5),
    },
    postAuthorRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flex: 1,
      minWidth: 0,
    },
    postAuthorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    postAuthorVerified: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postTimeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(4),
    },
    postAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      marginHorizontal: normalize(6),
      ...metaTextAndroid,
    },
    postTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight30,
      paddingHorizontal: normalize(10),
      borderRadius: normalize(13),
      gap: normalize(4),
    },
    postLocationText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    postLocationWrap: {
      flexShrink: 1,
    },
    postLocationInlineText: {
      flexShrink: 1,
      minWidth: 0,
    },
    distanceBadgeWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: normalize(8),
      flexShrink: 0,
    },
    distanceBadgeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(1),
      backgroundColor: colors.primaryLight20,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
    },
    distanceBadgeTextRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    distanceBadgeNumber: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },
    distanceBadgeUnit: {
      fontSize: normalize(10),
      fontFamily: fonts.regular,
      color: colors.primaryDark,
    },

    // 게시글 내용
    postContent: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(7),
    },
    postContentCompact: {
      marginBottom: normalize(5),
    },
    postTagsWrap: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
      gap: normalize(6),
      marginBottom: normalize(5),
      alignItems: 'center',
      overflow: 'hidden',
    },
    postTagChip: {
      flexShrink: 0,
    },
    postTagText: {
      fontSize: normalize(11),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    postTagMeasureHidden: {
      opacity: 0,
    },
    postTagMoreChip: {
      backgroundColor: colors.textLight10,
      paddingHorizontal: normalize(5),
      paddingVertical: normalize(1),
      borderRadius: normalize(10),
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
    postBodyColumnWithThumb: {
      minHeight: normalize(70),
      justifyContent: 'space-between',
      marginRight: normalize(10),
    },
    postFooterStart: {
      justifyContent: 'flex-start',
    },
    postThumb: {
      width: normalize(70),
      height: normalize(70),
      borderRadius: normalize(8),
      backgroundColor: colors.textLight10,
      alignSelf: 'flex-start',
    },

    // 내용과 푸터 사이 경계선
    postDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(10),
    },

    // 게시글 푸터 (좌: 좋아요&댓글, 우: 햄버거)
    postFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(15),
      paddingLeft: normalize(2),
    },
    postStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    postStatText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    menuButton: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    // 플로팅 버튼
    floatingButton: {
      position: 'absolute',
      right: normalize(20),
      bottom: normalize(20),
      width: normalize(50),
      height: normalize(50),
      borderRadius: normalize(28),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
  });
};

// 글쓰기 페이지 스타일
export const createWriteStyles = (width, normalize) => {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    keyboardAvoiding: {
      flex: 1,
    },
    scrollContentGrow: {
      flexGrow: 1,
    },
    fullFlex: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    box: {
      backgroundColor: colors.background,
    },
    box2: {
      padding: normalize(10),
      paddingBottom: normalize(35),
      backgroundColor: colors.background,
      alignItems: 'center',
      borderColor: colors.textLight20,
      borderTopWidth: 1,
    },
    guideContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    guideText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    guideLink: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      textDecorationLine: 'underline',
    },
    /** 본문 위 구분선 (제목/헤더 영역 아래) */
    content: {
      flex: 1,
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(14),
    },
    textInput: {
      flex: 1,
      fontSize: normalize(fontSizes.xxl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      textAlignVertical: 'top',
      lineHeight: normalize(22),
    },
    placeholder: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    /** SubHeader 오른쪽 완료 pill (TouchableOpacity는 SubHeader가 감쌈) */
    completePill: {
      backgroundColor: colors.primaryLight70,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(8),
    },
    completePillText: {
      fontSize: normalize(fontSizes.xl),
      fontWeight: '500',
      color: colors.writePillLabel,
    },
    /** 본문 비어 있을 때 등록 pill */
    completePillDisabled: {
      backgroundColor: colors.textLight10,
    },
    completePillTextDisabled: {
      color: colors.textSecondary,
    },
    /** 해시태그 섹션 상·하단 구분선 */
    writeHashtagTopDivider: {
      height: 1,
      backgroundColor: colors.textLight20,
    },
    writeHashtagBottomDivider: {
      height: 1,
      backgroundColor: colors.textLight20,
    },
    writeHashtagWrapper: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(20),
    },
    writeHashtagInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
    },
    writeHashtagPrefix: {
      fontSize: normalize(fontSizes.heading),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    writeHashtagDashedWrap: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: colors.textSecondary,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(7),
    },
    writeHashtagInput: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    writeHashtagCounter: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    writeHashtagTagScroll: {
      marginVertical: normalize(7),
    },
    writeHashtagTagList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(8),
      paddingBottom: normalize(2),
    },
    writeHashtagTagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.hashtagChipBg,
      borderWidth: 0.5,
      borderColor: colors.hashtagChipBorder,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      gap: normalize(6),
    },
    writeHashtagTagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.hashtagChipText,
    },
    writeHashtagTagRemove: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.hashtagChipRemove,
      fontWeight: '600',
    },
    writeHashtagSuggestionWrapper: {
      marginTop: normalize(10),
    },
    writeHashtagSuggestionTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginBottom: normalize(6),
    },
    writeHashtagSuggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight5,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(4),
    },
    writeHashtagSuggestionText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    topToolbarSection: {
      backgroundColor: colors.background,
    },
    topToolbar: {
      height: normalize(48),
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      gap: normalize(20),
      borderColor: colors.textLight20,
      borderTopWidth: 1,
    },
    toolbarIconButton: {
      position: 'relative',
      padding: normalize(2),
    },
    toolbarLocationButton: {
      padding: normalize(2),
    },
    toolbarBadge: {
      position: 'absolute',
      top: normalize(-6),
      right: normalize(-10),
      width: normalize(16),
      height: normalize(16),
      borderRadius: normalize(8),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolbarBadgeText: {
      color: colors.background,
      fontSize: normalize(10),
      fontWeight: '700',
    },
    locationChipWrap: {
      paddingHorizontal: normalize(16),
      paddingTop: normalize(8),
    },
    photoStripContent: {
      paddingHorizontal: normalize(16),
      paddingVertical: normalize(10),
    },
    photoAddButton: {
      width: normalize(60),
      height: normalize(60),
      borderRadius: normalize(10),
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(8),
      backgroundColor: colors.surface,
    },
    photoItemWrap: {
      marginRight: normalize(8),
      position: 'relative',
    },
    photoThumb: {
      width: normalize(60),
      height: normalize(60),
      borderRadius: normalize(10),
    },
    photoDeleteButton: {
      position: 'absolute',
      top: normalize(-6),
      right: normalize(-6),
      backgroundColor: '#000',
      borderRadius: normalize(10),
    },
    hashtagTagListWithPadding: {
      paddingHorizontal: normalize(16),
    },
    hashtagSuggestionSectionTop: {
      paddingHorizontal: normalize(16),
      marginTop: normalize(8),
    },
    tagPanelContainer: {
      backgroundColor: colors.background,
    },
    tagPanelWrapperCompact: {
      paddingVertical: normalize(10),
    },
    // 인라인 스타일 추가
    topToolbarSectionWithZIndex: {
      zIndex: 10,
      elevation: 10,
    },
    tagPanelContainerWithZIndex: {
      zIndex: 20,
      elevation: 20,
    },
    writeHashtagDashedWrapWithZIndex: {
      zIndex: 30,
      elevation: 30,
    },
    tagPanelAnimated: {
      zIndex: 20,
      elevation: 20,
    },
    writeHashtagInputInline: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
    },
    completePillWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

// 게시글 상세 페이지 스타일
export const createDetailStyles = (width, normalize) => {
  const metaLineHeight = normalize(18);
  const metaTextAndroid =
    Platform.OS === 'android' ? { includeFontPadding: false } : {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: normalize(100),
    },
    // 게시글 내용 영역
    contentSection: {
      paddingHorizontal: width * 0.05,
      paddingTop: normalize(13),
      paddingBottom: normalize(13),
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(7),
    },
    detailAuthorRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    detailAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    detailAuthorAnonymous: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    detailDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      marginHorizontal: normalize(6),
      ...metaTextAndroid,
    },
    detailTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    detailLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight30,
      paddingHorizontal: normalize(10),
      borderRadius: normalize(13),
      gap: normalize(4),
    },
    detailLocationText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    detailBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(10),
    },
    detailImagesWrap: {
      marginBottom: normalize(7),
      alignItems: 'flex-start',
    },
    detailImage: {
      height: normalize(260),
      marginBottom: normalize(8),
      alignSelf: 'flex-start',
    },
    detailImageFallback: {
      width: '100%',
    },
    detailImageLast: {
      marginBottom: 0,
    },
    detailTagsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(6),
      marginBottom: normalize(7),
    },
    detailTagChip: {
      flexShrink: 0,
    },
    detailTagText: {
      fontSize: normalize(11),
      fontFamily: fonts.bold,
      color: colors.textSecondary,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.textLight10,
      marginBottom: normalize(10),
    },
    detailFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(15),
      paddingLeft: normalize(2),
    },
    detailStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    detailStatText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    detailMenuBtn: {
      padding: normalize(4),
    },
    // 광고 영역
    adSection: {
      minHeight: normalize(40),
      marginHorizontal: width * 0,
      marginVertical: normalize(3),
      backgroundColor: 'grey',
      justifyContent: 'center',
      alignItems: 'center',
    },
    adSectionText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textWhite,
    },
    // 댓글 섹션 (SchoolMail.style.js smDetailComment* 와 동일 톤·간격)
    commentSection: {
      paddingHorizontal: width * 0.03,
      paddingTop: normalize(8),
      paddingBottom: normalize(10),
    },
    commentSectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textPrimary,
      marginBottom: normalize(12),
    },
    commentItem: {
      marginBottom: normalize(6),
    },
    commentItemReply: {
      marginBottom: normalize(12),
      marginLeft: normalize(12),
      marginRight: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    /** 댓글·대댓글 공통 말풍선 (= smDetailCommentBubble) */
    commentBubble: {
      backgroundColor: colors.background,
      borderRadius: normalize(12),
      paddingVertical: normalize(8),
      paddingLeft: normalize(10),
    },
    /** 대댓글 말풍선 가로 확장 (= smDetailCommentBubbleReply) */
    commentBubbleReply: {
      flex: 1,
      minWidth: 0,
      marginRight: 0,
    },
    /** 댓글 달기 포커스 (= smDetailCommentBubbleReplying, 그림자 없음) */
    commentBubbleReplying: {
      backgroundColor: colors.primaryLight20,
    },
    commentReplyArrow: {
      marginRight: normalize(6),
      marginTop: normalize(7),
    },
    commentReplyBody: {
      flex: 1,
    },
    commentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: normalize(6),
    },
    commentAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    commentAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    commentAuthorWriter: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    commentDot: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textSecondary,
      marginHorizontal: normalize(4),
    },
    commentTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    commentBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(6),
    },
    commentBodyWithTag: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      lineHeight: normalize(20),
      marginBottom: normalize(6),
    },
    commentTag: {
      color: colors.primary,
      fontFamily: fonts.bold,
    },
    commentFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    commentFooterLeft: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: normalize(12),
      flex: 1,
    },
    commentLikeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    commentReplyButton: {
      paddingVertical: normalize(4),
      paddingHorizontal: normalize(6),
    },
    commentReplyButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
      marginTop: -normalize(2),
    },
    loadMoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: normalize(8),
      paddingRight: normalize(4),
      gap: normalize(4),
    },
    loadMoreRowReply: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingTop: normalize(2),
      paddingBottom: normalize(10),
      paddingRight: normalize(4),
      gap: normalize(4),
      marginLeft: normalize(18),
      marginTop: -normalize(4),
    },
    loadMoreText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textSecondary,
    },
    // 하단 댓글 입력
    bottomInputRow: {
      flexDirection: 'column',
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.textLight10,
      paddingHorizontal: width * 0.03,
      paddingVertical: normalize(12),
      paddingBottom: Platform.OS === 'ios' ? normalize(34) : normalize(12),
    },
    replyTargetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: normalize(6),
      paddingHorizontal: normalize(4),
    },
    replyTargetText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.primary,
      flex: 1,
    },
    replyTargetCancel: {
      padding: normalize(4),
    },
    bottomInputInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(10),
    },
    bottomInput: {
      flex: 1,
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(16),
      borderRadius: normalize(24),
      backgroundColor: colors.textLight5,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textPrimary,
      maxHeight: normalize(80),
    },
    sendButton: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(22),
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
};
