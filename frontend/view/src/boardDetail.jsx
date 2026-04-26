import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, InteractionManager, Platform, Text, View, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { usePlatformInsets } from '../../hooks/usePlatformInsets';
import { colors } from '../../styles/colors';
import { createDetailStyles, getNormalize } from '../../styles/board.style';
import { useNotification } from '../../context/NotificationContext';
import { useLocationContext } from '../../context/LocationContext';
import ImageViewer from './ImageViewer';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useBoardDetail } from './board/useBoardDetail';
import BoardPostContent from './board/BoardPostContent';
import BoardCommentTree from './board/BoardCommentTree';
import BoardFloatingMenu from './board/BoardFloatingMenu';

export default function BoardDetail({ navigation, route }) {
  const { coords } = useLocationContext();
  const { refreshHasUnread } = useNotification();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);

  const routePost = route?.params?.post;
  const routePostId = route?.params?.postId;

  const [bottomComment, setBottomComment] = useState('');
  const [commentImages, setCommentImages] = useState([]);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToAuthorLabel, setReplyToAuthorLabel] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [viewerUri, setViewerUri] = useState(null);
  const [imageRatios, setImageRatios] = useState({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = usePlatformInsets();
  const inputTranslateY = useSharedValue(0);
  const bottomInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});
  const scrollToCommentIdRef = useRef(null);
  const INITIAL_REPLIES = 3;

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuContext(null);
    setFloatingMenuAnchor(null);
  };

  const {
    post,
    setPost,
    allComments,
    setAllComments,
    postLiked,
    postScrapped,
    commentLikedState,
    isMyPostFromApi,
    postAuthorId,
    currentUserId,
    deletedCommentIds,
    isSendingComment,
    handleSendComment,
    handlePostLike,
    handlePostScrap,
    handleCommentLike,
    handleDeletePost,
    handleDeleteComment,
    startNoteToUser,
    handleSharePost,
  } = useBoardDetail({
    navigation,
    routePost,
    routePostId,
    coords,
    refreshHasUnread,
    bottomComment,
    setBottomComment,
    commentImages,
    setCommentImages,
    replyToCommentId,
    setReplyToCommentId,
    setReplyToAuthorLabel,
    onCloseMenu: closeFloatingMenu,
  });

  const findCommentById = (comments, id) => {
    for (const c of comments) {
      if (c.id === id) return c;
      if (c.replies?.length) {
        const found = findCommentById(c.replies, id);
        if (found) return found;
      }
    }
    return null;
  };

  const filterCommentsTree = (comments, deletedSet) => {
    if (!comments || !Array.isArray(comments)) return [];
    return comments
      .filter((c) => !deletedSet.has(c.id))
      .map((c) => ({
        ...c,
        replies: c.replies?.length ? filterCommentsTree(c.replies, deletedSet) : [],
      }));
  };

  const flattenReplies = (replies, depth = 0, parentAuthorLabel = null) => {
    const result = [];
    for (const r of replies) {
      result.push({ reply: r, depth, parentAuthorLabel });
      if (r.replies && r.replies.length) {
        result.push(...flattenReplies(r.replies, depth + 1, r.authorLabel));
      }
    }
    return result;
  };

  const buildFlatComments = (comments, expandedRepliesMap) => {
    const result = [];
    for (const c of comments) {
      result.push({ type: 'comment', data: c });
      const replies = c.replies || [];
      const flattened = flattenReplies(replies, 0, c.authorLabel);
      const isExpanded = expandedRepliesMap[c.id];
      const repliesToShow = isExpanded ? flattened : flattened.slice(0, INITIAL_REPLIES);

      for (const { reply, parentAuthorLabel } of repliesToShow) {
        result.push({ type: 'reply', data: reply, parentAuthorLabel });
      }
      if (flattened.length > INITIAL_REPLIES && !isExpanded) {
        result.push({ type: 'more', commentId: c.id, count: flattened.length - INITIAL_REPLIES });
      }
      if (isExpanded && flattened.length > INITIAL_REPLIES) {
        result.push({ type: 'collapse', commentId: c.id });
      }
    }
    return result;
  };

  const visibleComments = useMemo(
    () => filterCommentsTree(allComments ?? [], new Set(deletedCommentIds)),
    [allComments, deletedCommentIds]
  );

  const flatComments = useMemo(
    () => buildFlatComments(visibleComments, expandedReplies),
    [visibleComments, expandedReplies]
  );

  const openFloatingMenu = (context, ref) => {
    if (ref?.measureInWindow) {
      ref.measureInWindow((x, y) => {
        setFloatingMenuAnchor({ x, y });
        setFloatingMenuContext(context);
        setFloatingMenuVisible(true);
      });
    } else {
      setFloatingMenuAnchor(null);
      setFloatingMenuContext(context);
      setFloatingMenuVisible(true);
    }
  };

  const scrollToComment = (commentId) => {
    const index = flatComments.findIndex(
      (item) => (item.type === 'comment' || item.type === 'reply') && item.data.id === commentId
    );
    if (index === -1 || !scrollViewRef.current) return;
    try {
      scrollViewRef.current.scrollToIndex({
        index,
        animated: true,
        viewOffset: normalize(80),
        viewPosition: 0,
      });
    } catch (e) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleKeyboardShowScroll = () => {
    const delay = Platform.OS === 'ios' ? 200 : 100;
    setTimeout(() => {
      const commentId = scrollToCommentIdRef.current;
      if (commentId) {
        scrollToCommentIdRef.current = null;
        scrollToComment(commentId);
      } else {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, delay);
  };

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        inputTranslateY.value = -Math.max(e.height - insets.bottom, 0);
      },
      onEnd: (e) => {
        'worklet';
        inputTranslateY.value = -Math.max(e.height - insets.bottom, 0);
        runOnJS(setKeyboardHeight)(e.height);
        if (e.height > 0) {
          runOnJS(handleKeyboardShowScroll)();
        }
      },
    },
    [insets.bottom]
  );

  const inputAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputTranslateY.value }],
  }));

  const focusReplyInput = (commentId) => {
    if (commentId != null) {
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
      setBottomComment('');
      scrollToCommentIdRef.current = null;

      setTimeout(() => {
        const target = findCommentById(allComments, commentId);
        setReplyToCommentId(commentId);
        setReplyToAuthorLabel(target?.authorLabel ?? '');
        scrollToCommentIdRef.current = commentId;
      }, 50);

      InteractionManager.runAfterInteractions(() => {
        bottomInputRef.current?.focus();
      });
    } else {
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
      scrollToCommentIdRef.current = null;
      scrollViewRef.current?.scrollToEnd({ animated: true });
      InteractionManager.runAfterInteractions(() => {
        bottomInputRef.current?.focus();
      });
    }
  };

  useEffect(() => {
    if (!replyToCommentId) return;
    const task = InteractionManager.runAfterInteractions(() => {
      bottomInputRef.current?.focus();
    });
    return () => task.cancel();
  }, [replyToCommentId]);

  const toggleRepliesExpand = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const clearReplyTarget = () => {
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
  };

  const onTagPress = (label) => {
    const searchQuery = `#${String(label).trim().replace(/^#+/, '')}`;
    navigation.navigate('SearchResult', {
      query: searchQuery,
      searchType: 'hashtag',
    });
  };

  const onImageLoad = (uri, e) => {
    const w = e?.nativeEvent?.source?.width;
    const h = e?.nativeEvent?.source?.height;
    if (!w || !h) return;
    const ratio = w / h;
    setImageRatios((prev) => {
      if (prev[uri] === ratio) return prev;
      return { ...prev, [uri]: ratio };
    });
  };

  const commentTree = BoardCommentTree({
    flatComments,
    commentLikedState,
    replyToCommentId,
    expandedReplies,
    onFocusReply: focusReplyInput,
    onCommentLike: handleCommentLike,
    onToggleReplies: toggleRepliesExpand,
    onOpenMenu: openFloatingMenu,
    commentMenuRefs,
    styles,
    normalize,
    width,
  });

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="게시판" onBack={() => navigation.goBack()} />
        </View>
        <View
          style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden', zIndex: 0 }}
          pointerEvents="box-none"
        >
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <FlatList
              ref={scrollViewRef}
              style={{ flex: 1 }}
              data={flatComments}
              keyExtractor={commentTree.keyExtractor}
              renderItem={commentTree.renderItem}
              ListHeaderComponent={
                <View>
                  <BoardPostContent
                    post={post}
                    postLiked={postLiked}
                    postScrapped={postScrapped}
                    isMyPostFromApi={isMyPostFromApi}
                    onLike={handlePostLike}
                    onScrap={handlePostScrap}
                    onMenu={() => openFloatingMenu('post', postMenuButtonRef.current)}
                    onTagPress={onTagPress}
                    onImagePress={setViewerUri}
                    onImageLoad={onImageLoad}
                    imageRatios={imageRatios}
                    styles={styles}
                    normalize={normalize}
                    width={width}
                    postMenuButtonRef={postMenuButtonRef}
                  />
                  <View style={styles.adSection}>
                    <Text style={styles.adSectionText}>광고</Text>
                  </View>
                </View>
              }
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: keyboardHeight },
              ]}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewOffset: normalize(80),
                  });
                }, 100);
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            />

            <Animated.View
              style={[
                {
                  backgroundColor: colors.background,
                  paddingBottom: Math.max(insets.bottom, normalize(12)),
                },
                inputAnimStyle,
              ]}
            >
              <CommentInput
                bottomInputRef={bottomInputRef}
                bottomComment={bottomComment}
                setBottomComment={setBottomComment}
                selectedImages={commentImages}
                onImagesChange={setCommentImages}
                showImageAttach={false}
                replyToCommentId={replyToCommentId}
                replyToAuthorLabel={replyToAuthorLabel}
                clearReplyTarget={clearReplyTarget}
                handleSendComment={handleSendComment}
                isSendingComment={isSendingComment}
                styles={styles}
                normalize={normalize}
              />
            </Animated.View>
          </View>
        </View>

        <BoardFloatingMenu
          visible={floatingMenuVisible}
          anchor={floatingMenuAnchor}
          context={floatingMenuContext}
          allComments={allComments}
          isMyPostFromApi={isMyPostFromApi}
          currentUserId={currentUserId}
          postAuthorId={postAuthorId}
          onClose={closeFloatingMenu}
          onDeletePost={handleDeletePost}
          onDeleteComment={handleDeleteComment}
          onSharePost={handleSharePost}
          onNoteToUser={{ start: startNoteToUser, postUserId: postAuthorId }}
          styles={styles}
          normalize={normalize}
          width={width}
        />

        <ImageViewer
          visible={Boolean(viewerUri)}
          uri={viewerUri}
          onClose={() => setViewerUri(null)}
        />
      </SafeAreaView>
    </View>
  );
}