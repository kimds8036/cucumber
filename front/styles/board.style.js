import { StyleSheet, Platform } from 'react-native';
import { colors, fonts, fontSizes } from './colors';

export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

/** 게시글 카드용 — shadow.sm 보다 한 단계 옅게 */
const postCardLift = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  android: { elevation: 1 },
});

export const createBoardStyles = (width, normalize) => {
  const metaLineHeight = normalize(18);
  const metaTextAndroid =
    Platform.OS === 'android' ? { includeFontPadding: false } : {};

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },

    // 게시글 목록
    postList: {
      flex: 1,
      paddingHorizontal: width * 0.04,
    },
    postItem: {
      backgroundColor: colors.white,
      borderRadius: normalize(18),
      borderWidth: 1,
      borderColor: colors.textLight1,
      padding: normalize(12),
      marginBottom: normalize(12),
    },
    postItemFeatured: {
      backgroundColor: colors.primaryLight2,
      borderWidth: 1,
      borderColor: colors.primaryLight4,
    },
    popularBadge: {
      marginRight: normalize(6),
      borderWidth: 1,
      borderColor: colors.scrap,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(6),
    },
    popularBadgeText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.bold,
      color: colors.scrap,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },

    // 게시글 헤더 (좌: 시간, 우: 거리 배지)
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
    },
    postAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      marginHorizontal: normalize(6),
      ...metaTextAndroid,
    },
    postTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      ...metaTextAndroid,
    },
    postLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight4,
      paddingHorizontal: normalize(6),
      borderRadius: normalize(13),
    },
    postLocationText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      backgroundColor: colors.primaryLight3,
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
      color: colors.text,
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
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(2),
    },
    postTagMeasureHidden: {
      position: 'absolute',
      top: -9999,
      left: -9999,
      opacity: 0,
    },
    postTagMoreChip: {
      backgroundColor: colors.primaryLight2,
      paddingHorizontal: normalize(1),
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
      backgroundColor: colors.textLight1,
      alignSelf: 'flex-start',
    },

    // 내용과 푸터 사이 경계선
    postDivider: {
      height: 1,
      backgroundColor: colors.textLight1,
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
      gap: normalize(10),
    },
    postStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    postStatText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    menuButton: {
      justifyContent: 'center',
      alignItems: 'center',
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
      backgroundColor: colors.white,
    },
    box: {
      backgroundColor: colors.white,
    },
    box2: {
      padding: normalize(10),
      backgroundColor: colors.white,
      alignItems: 'center',
    },
    guideContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    guideText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textAlign: 'center',
    },
    guideLink: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      color: colors.text,
      textAlignVertical: 'top',
      lineHeight: normalize(22),
    },
    placeholder: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    /** SubHeader 오른쪽 완료 pill (TouchableOpacity는 SubHeader가 감쌈) */
    completePill: {
      backgroundColor: colors.primaryLight6,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(6),
    },
    completePillText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    /** 본문 비어 있을 때 등록 pill */
    completePillDisabled: {
      backgroundColor: colors.textLight1,
    },
    completePillTextDisabled: {
      color: colors.textLight4,
    },
    /** 해시태그 섹션 상·하단 구분선 */
    writeHashtagTopDivider: {
      height: 1,
      backgroundColor: colors.textLight2,
    },
    writeHashtagBottomDivider: {
      height: 1,
      backgroundColor: colors.textLight2,
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
      color: colors.textLight4,
    },
    writeHashtagDashedWrap: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: colors.textLight4,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(5),
      minHeight: normalize(34),
      justifyContent: 'center',
    },
    writeHashtagInput: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    writeHashtagCounter: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    writeHashtagTagScroll: {
      marginVertical: normalize(7),
    },
    /** 첨부된 해시태그 칩 행(입력란 바로 아래) — 입력란과 간격만 좁힘 */
    writeHashtagAttachedTagScroll: {
      marginTop: normalize(2),
      marginBottom: normalize(4),
    },
    writeHashtagTagList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalize(8),
    },
    writeHashtagTagChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(20),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(2),
      gap: normalize(6),
    },
    writeHashtagTagText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    writeHashtagTagRemove: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    writeHashtagSuggestionWrapper: {
      marginTop: normalize(10),
    },
    writeHashtagSuggestionTitle: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    writeHashtagSuggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textLight1,
      borderRadius: normalize(16),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(4),
    },
    writeHashtagSuggestionText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    boardScopeHint: {
      paddingHorizontal: width * 0.04,
      paddingBottom: normalize(8),
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      marginLeft: normalize(8),
      marginTop: normalize(4),
    },
    writeComposer: {
      flexGrow: 1,
      paddingHorizontal: width * 0.04,
      paddingBottom: normalize(16),
    },
    writeBodyBox: {
      borderWidth: 1,
      borderColor: colors.textLight1,
      borderRadius: normalize(20),
      backgroundColor: colors.white,
      minHeight: normalize(280),
    },
    writeBodyBoxGrow: {
      flexGrow: 1,
    },
    writeBodyInput: {
      flexGrow: 1,
      minHeight: normalize(140),
      paddingHorizontal: normalize(14),
      paddingTop: normalize(14),
      paddingBottom: normalize(8),
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      textAlignVertical: 'top',
      lineHeight: normalize(22),
    },
    writeBodyPhotoScroll: {
      flexGrow: 0,
      flexShrink: 0,
    },
    writeBodyPhotoStrip: {
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(8),
      alignItems: 'center',
    },
    writeBodyActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(16),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(10),
    },
    pollBox: {
      marginHorizontal: normalize(14),
      marginBottom: normalize(8),
      padding: normalize(14),
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(12),
      gap: normalize(8),
    },
    pollOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      minHeight: normalize(44),
      paddingHorizontal: normalize(12),
      borderRadius: normalize(12),
      backgroundColor: colors.white,
    },
    pollOptionMark: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    pollOptionInput: {
      flex: 1,
      padding: 0,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      textAlignVertical: 'center',
      ...Platform.select({
        android: { includeFontPadding: false },
      }),
    },
    pollAddButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: normalize(10),
      borderRadius: normalize(12),
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.white,
    },
    pollAddButtonText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    pollMultiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: normalize(8),
      marginTop: normalize(4),
    },
    pollCheckbox: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(4),
      borderWidth: 1.5,
      borderColor: colors.textLight2,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pollCheckboxOn: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    pollMultiLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    writeHashtagBlock: {
      gap: normalize(8),
    },
    writeHashtagField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      minHeight: normalize(44),
      paddingHorizontal: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight1,
      borderRadius: normalize(20),
      backgroundColor: colors.white,
    },
    writeHashtagFieldInput: {
      flex: 1,
      padding: 0,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    writeHashtagRecommend: {
      marginTop: normalize(8),
      gap: normalize(8),
      marginBottom: normalize(35),
    },
    writeHashtagRecommendChip: {
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(2),
      borderRadius: normalize(20),
      borderWidth: 1,
      borderColor: colors.textLight2,
      backgroundColor: colors.white,
    },
    writeHashtagRecommendText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    topToolbarSection: {
      backgroundColor: colors.white,
      borderColor: colors.textLight2,
      borderBottomWidth: 0.5,
    },
    topToolbarSectionTagOpen: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.textLight1,
    },
    topToolbar: {
      height: normalize(48),
      backgroundColor: colors.white,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(16),
      gap: normalize(20),
    },
    toolbarIconButton: {
      position: 'relative',
      padding: normalize(2),
    },
    toolbarLocationButton: {
      padding: normalize(2),
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
      borderColor: colors.textLight1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: normalize(8),
      backgroundColor: colors.textLight1,
    },
    photoItemWrap: {
      marginRight: normalize(8),
      position: 'relative',
    },
    photoThumb: {
      width: normalize(80),
      height: normalize(80),
      borderRadius: normalize(10),
    },
    photoDeleteButton: {
      position: 'absolute',
      top: normalize(-6),
      right: normalize(-6),
      backgroundColor: colors.textLight5,
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
      backgroundColor: colors.white,
    },
    tagPanelWrapperCompact: {
      paddingTop: normalize(10),
      paddingBottom: normalize(10),
    },
    // 인라인 스타일 추가
    topToolbarSectionWithZIndex: {
      zIndex: 10,
    },
    tagPanelContainerWithZIndex: {
      zIndex: 20,
      ...Platform.select({ android: {}, ios: {} }),
    },
    writeHashtagDashedWrapWithZIndex: {
      zIndex: 30,
      ...Platform.select({ android: {}, ios: {} }),
    },
    tagPanelAnimated: {
      zIndex: 20,
      ...Platform.select({ android: {}, ios: {} }),
    },
    writeHashtagInputInline: {
      flex: 1,
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.text,
      paddingVertical: 0,
      margin: 0,
      lineHeight: normalize(18),
      ...Platform.select({
        android: {
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
      }),
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

  /** CommentInput / MessageInput 공통 — placeholder·본문 동일 메트릭 */
  const bottomInputFontSize = normalize(fontSizes.xl);
  const bottomInputLineHeight = Math.round(bottomInputFontSize * (20 / 14));
  const bottomInputMinHeight = normalize(44);
  const bottomInputPaddingV = Math.max(
    normalize(6),
    Math.round((bottomInputMinHeight - bottomInputLineHeight) / 2),
  );

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    scrollContent: {
      paddingBottom: normalize(24),
    },
    // 게시글 내용 영역
    contentSection: {
      paddingHorizontal: width * 0.04,
      paddingTop: normalize(13),
      paddingBottom: normalize(13),
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(7),
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
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(2),
    },
    detailAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailAuthor: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.alert,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    detailAuthorAnonymous: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    /** 게시글 익명 / 작성자 댓글 — 연회색 둥근 칩 */
    detailAuthorWriterPill: {
      backgroundColor: colors.textLight1,
      borderRadius: 999,
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(2),
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: metaLineHeight + normalize(2),
    },
    detailAuthorWriterPillText: {
      fontSize: normalize(fontSizes.md),
      fontFamily: fonts.regular,
      color: colors.textLight6,
      lineHeight: normalize(14),
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    detailDot: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      marginHorizontal: normalize(6),
      ...metaTextAndroid,
    },
    detailTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: metaLineHeight,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    detailMetaDot: {
      marginHorizontal: normalize(5),
      fontSize: normalize(fontSizes.lg),
      lineHeight: metaLineHeight,
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    detailLocation: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primaryLight4,
      paddingHorizontal: normalize(10),
      borderRadius: normalize(13),
      gap: normalize(4),
    },
    detailLocationText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    detailBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(20),
      marginBottom: normalize(10),
    },
    detailImagesWrap: {
      width: '100%',
      marginBottom: normalize(7),
      overflow: 'hidden',
    },
    detailImageFrame: {
      width: '100%',
      borderRadius: normalize(10),
      overflow: 'hidden',
    },
    detailImage: {
      width: '100%',
      marginBottom: normalize(8),
      borderRadius: normalize(10),
    },
    detailImageFallback: {
      width: '100%',
      height: normalize(260),
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
      backgroundColor: colors.primaryLight3,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(2),
    },
    detailTagText: {
      fontSize: normalize(11),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    detailDivider: {
      height: 1,
      backgroundColor: colors.textLight1,
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
      height: normalize(20),
      gap: normalize(3),
    },
    detailStatIcon: {
      height: normalize(20),
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailStatText: {
      height: normalize(20),
      fontSize: normalize(fontSizes.xl),
      lineHeight: normalize(20),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      fontVariant: ['tabular-nums'],
      textAlign: 'left',
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    detailMenuBtn: {
      paddingVertical: normalize(4),
      paddingLeft: normalize(2),
      paddingRight: normalize(0),
    },
    // 광고 영역 — searchscreen BoarddetailADplaceholder(badgeOnLeft)와 동일
    adSection: {
      minHeight: normalize(40),
      marginHorizontal: width * 0,
      backgroundColor: colors.primaryLight2,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.textLight1,
    },
    adSectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalize(18),
      paddingVertical: normalize(12),
      gap: normalize(12),
      width: '100%',
    },
    adSectionBadge: {
      flexShrink: 0,
    },
    adSectionText: {
      flex: 1,
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
    },
    // 댓글 섹션 (SchoolMail.style.js smDetailComment* 와 동일 톤·간격)
    commentSection: {
      paddingHorizontal: width * 0.04,
    },
    commentListHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
      paddingVertical: normalize(6)
    },
    commentListHeaderText: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
    },
    commentSectionTitle: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: normalize(12),
    },
    commentItem: {},
    commentGutter: {
      paddingHorizontal: width * 0.04,
    },
    commentRow: {
      paddingVertical: normalize(10),
    },
    commentRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: '#EFEFEF',
    },
    /** 대댓글 묶음: 화살표 1개 + inset well
     * marginLeft = (부모 아바타 폭 - 화살표 size) / 2 → 아바타·화살표 중심 정렬
     */
    commentReplyGroup: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginLeft: (normalize(30) - normalize(18)) / 2,
      marginTop: normalize(10),
      gap: normalize(4),
    },
    commentReplyArrow: {
      paddingTop: normalize(12),
    },
    commentReplyWell: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.replyWell,
      borderRadius: normalize(18),
      paddingVertical: normalize(12),
      paddingHorizontal: normalize(14),
      overflow: 'hidden',
      boxShadow:
        'inset 2px 2px 6px rgba(0,0,0,0.07), inset -2px -2px 6px rgba(255,255,255,0.9)',
    },
    commentReplyDivider: {
      height: 0.5,
      backgroundColor: colors.replyWellLine,
      marginVertical: normalize(10),
    },
    /** well 안 대댓글 — 세로 여백은 well·구분선이 담당 */
    commentReplyItem: {},
    commentItemReply: {
      marginRight: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    /** 댓글·대댓글 공통. 바깥 여백은 commentRow가 담당한다 */
    commentBubble: {},
    /** 대댓글 말풍선 가로 확장 (= smDetailCommentBubbleReply) */
    commentBubbleReply: {
      flex: 1,
      minWidth: 0,
      marginRight: 0,
    },
    /** 댓글 달기 포커스 (= smDetailCommentBubbleReplying, 그림자 없음) */
    commentBubbleReplying: {
      backgroundColor: colors.primaryLight2,
    },
    commentReplyBody: {
      flex: 1,
    },
    /** 댓글 본문(작성자·내용·푸터) 한 덩어리 */
    commentBlock: {
      flex: 1,
    },
    /** 댓글 메타 행 — 이름·뱃지·시간·핀 · 높이 18 */
    commentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: normalize(18),
      flex: 1,
      minWidth: 0,
    },
    commentAuthorName: {
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(18),
      fontFamily: fonts.bold,
      color: colors.textLight4,
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    /** 게시글 작성자 댓글 — 이름과 동일 메트릭, 색만 alert */
    commentAuthorWriterName: {
      color: colors.alert,
    },
    commentPinSlot: {
      width: normalize(18),
      height: normalize(18),
      marginLeft: normalize(4),
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    commentAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    commentAuthor: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    commentAuthorWriter: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.alert,
    },
    commentDot: {
      fontSize: normalize(fontSizes.xl),
      color: colors.textLight4,
      marginHorizontal: normalize(4),
    },
    commentTime: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      lineHeight: normalize(18),
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    commentMetaDot: {
      marginHorizontal: normalize(5),
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(18),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      textAlignVertical: 'center',
      includeFontPadding: false,
      ...metaTextAndroid,
    },
    commentBody: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(20),
    },
    commentBodyWithTag: {
      fontSize: normalize(fontSizes.xl),
      fontFamily: fonts.regular,
      color: colors.text,
      lineHeight: normalize(20),
    },
    commentTag: {
      color: colors.primaryDark,
      fontFamily: fonts.bold,
    },
    commentReplyLabel: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.bold,
      color: colors.primaryDark,
      lineHeight: normalize(20),
    },
    commentFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: normalize(4),
    },
    commentFooterLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    commentLikeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: normalize(34),
      height: normalize(18),
      gap: normalize(3),
    },
    commentLikeIcon: {
      height: normalize(18),
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentLikeCount: {
      minWidth: normalize(18),
      height: normalize(18),
      fontSize: normalize(fontSizes.lg),
      lineHeight: normalize(18),
      fontFamily: fonts.regular,
      color: colors.textLight4,
      includeFontPadding: false,
      textAlignVertical: 'center',
      textAlign: 'left',
      fontVariant: ['tabular-nums'],
      marginTop: Platform.OS === 'android' ? -1 : 0,
    },
    commentReplyButtonText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
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
      paddingTop: normalize(8),
      paddingBottom: normalize(8),
      paddingRight: normalize(4),
      gap: normalize(4),
    },
    loadMoreText: {
      fontSize: normalize(fontSizes.lg),
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    // 하단 댓글 입력
    bottomInputRow: {
      flexDirection: 'column',
      backgroundColor: colors.white,
      borderTopWidth: 0.5,
      borderTopColor: colors.textLight1,
      paddingHorizontal: width * 0.04,
      paddingVertical: normalize(12),
      paddingBottom: Platform.OS === 'ios' ? normalize(14) : normalize(12),
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
      minHeight: bottomInputMinHeight,
      paddingVertical: bottomInputPaddingV,
      paddingHorizontal: normalize(16),
      borderRadius: normalize(24),
      backgroundColor: colors.textLight1,
      fontSize: bottomInputFontSize,
      lineHeight: bottomInputLineHeight,
      fontFamily: fonts.regular,
      color: colors.text,
      maxHeight: normalize(80),
      textAlignVertical: 'center',
      ...Platform.select({
        android: {
          includeFontPadding: false,
        },
      }),
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
