import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Keyboard,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { colors, fonts } from '../../styles/colors';
import { createDetailStyles, getNormalize } from '../../styles/board.style';

// 댓글 본문에서 @태그 파싱하여 렌더 (일반 텍스트 + @익명N 초록 강조)
function CommentBody({ content, styles }) {
  const parts = [];
  let last = 0;
  const regex = /@(익명\d+)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(
        <Text key={`t-${last}`} style={styles.commentBody}>
          {content.slice(last, m.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={`tag-${m.index}`} style={[styles.commentBody, styles.commentTag]}>
        @{m[1]}
      </Text>
    );
    last = regex.lastIndex;
  }
  if (last < content.length) {
    parts.push(
      <Text key={`t-${last}`} style={styles.commentBody}>
        {content.slice(last)}
      </Text>
    );
  }
  if (parts.length === 0) {
    return <Text style={styles.commentBody}>{content}</Text>;
  }
  return <Text style={styles.commentBody}>{parts}</Text>;
}

export default function BoardDetail({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createDetailStyles(width, normalize), [width, normalize]);

  const post = route?.params?.post ?? {
    id: 1,
    author: '작성자',
    time: '2시간 전',
    location: '24m',
    content:
      '중간고사 D-7 같이 공부하실 분? 시험기간인데 혼자 공부하니까 집중이 안 돼서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
    likes: 213,
    comments: 89,
    liked: false,
  };

  const isMyPost = route?.params?.isMyPost ?? false;
  const [postLiked, setPostLiked] = useState(post.liked ?? false);
  const [commentLikedState, setCommentLikedState] = useState({});
  const [bottomComment, setBottomComment] = useState('');
  const bottomInputRef = useRef(null);
  const INITIAL_REPLIES = 3;
  const [expandedReplies, setExpandedReplies] = useState({});
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null); // 'post' | commentId | null
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});

  const defaultMenuItems = useMemo(
    () => [
      { label: '쪽지 보내기', iconName: 'chatbubble-outline', onPress: () => {} },
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
      { label: '공유하기', iconName: 'share-outline', onPress: () => {} },
    ],
    []
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
  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuContext(null);
    setFloatingMenuAnchor(null);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const allComments = [
    {
      id: 'c1',
      authorLabel: '익명 1',
      isWriter: false,
      time: '15분 전',
      content: '오늘 밥 뭐 나옴?',
      likes: 1,
      replies: [
        {
          id: 'c1-1',
          authorLabel: '익명 2',
          isWriter: false,
          time: '15분 전',
          content: '오늘 밥 뭐 나옴?',
          likes: 1,
          replies: [
            {
              id: 'c1-1-1',
              authorLabel: '작성자',
              isWriter: true,
              time: '15분 전',
              content: '@익명2 맛있었어??',
              likes: 1,
              replies: [],
            },
          ],
        },
        {
          id: 'c2-1',
          authorLabel: '익명 2',
          isWriter: false,
          time: '15분 전',
          content: '오늘 밥 뭐 나옴?',
          likes: 1,
          replies: [
            {
              id: 'c2-1-1',
              authorLabel: '작성자',
              isWriter: true,
              time: '15분 전',
              content: '@익명2 맛있었어??',
              likes: 1,
              replies: [],
            },
          ],
        },
        {
          id: 'c3-1',
          authorLabel: '익명 2',
          isWriter: false,
          time: '15분 전',
          content: '오늘 밥 뭐 나옴?',
          likes: 1,
          replies: [
            {
              id: 'c3-1-1',
              authorLabel: '작성자',
              isWriter: true,
              time: '15분 전',
              content: '@익명2 맛있었어??',
              likes: 1,
              replies: [],
            },
          ],
        },
        {
          id: 'c4-1',
          authorLabel: '익명 3',
          isWriter: false,
          time: '14분 전',
          content: '저도 궁금해요',
          likes: 0,
          replies: [],
        },
        {
          id: 'c5-1',
          authorLabel: '익명 1',
          isWriter: false,
          time: '13분 전',
          content: '급식표 확인해봐요',
          likes: 2,
          replies: [],
        },
      ],
    },
    {
      id: 'c2',
      authorLabel: '익명 1',
      isWriter: false,
      time: '15분 전',
      content: '오늘 밥 뭐 나옴?',
      likes: 1,
      replies: [],
    },
    {
      id: 'c3',
      authorLabel: '익명 2',
      isWriter: false,
      time: '14분 전',
      content: '나도 궁금해요',
      likes: 0,
      replies: [],
    },
    {
      id: 'c4',
      authorLabel: '익명 1',
      isWriter: false,
      time: '10분 전',
      content: '오늘 밥 뭐 나옴?',
      likes: 1,
      replies: [],
    },
  ];

  const focusReplyInput = () => {
    bottomInputRef.current?.focus();
  };

  const toggleRepliesExpand = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleBack = () => navigation.goBack();
  const handleEdit = () => {}; // TODO

  const handlePostLike = () => {
    setPostLiked((prev) => !prev);
    // TODO: DB 연동 시 좋아요 저장/해제 API 호출 (예: POST /api/posts/:id/like)
    // await api.post(`/posts/${post.id}/like`);
  };

  const handleCommentLike = (commentId) => {
    setCommentLikedState((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
    // TODO: DB 연동 시 댓글 좋아요 저장/해제 API 호출 (예: POST /api/comments/:id/like)
    // await api.post(`/comments/${commentId}/like`);
  };

  const handleSendComment = () => {
    if (!bottomComment.trim()) return;
    // TODO: API
    setBottomComment('');
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

  const renderComment = (item, isReply = false, parentAuthorLabel = null, onFocusReply, likeState = {}) => {
    const isCommentLiked = likeState.liked ?? false;
    const onCommentLike = likeState.onLike;
    const AuthorLabel = item.isWriter ? (
      <Text style={styles.commentAuthorWriter}>{item.authorLabel}</Text>
    ) : (
      <Text style={styles.commentAuthor}>{item.authorLabel}</Text>
    );

    const bodyHasTag = /@익명\d+/.test(item.content);
    const contentEl = bodyHasTag ? (
      <CommentBody content={item.content} styles={styles} />
    ) : (
      <Text style={styles.commentBody}>{item.content}</Text>
    );

    const block = (
      <View key={item.id} style={isReply ? styles.commentReplyBody : undefined}>
        <View style={styles.commentRow}>
          <View style={styles.commentAuthorRow}>
            {AuthorLabel}
            <Text style={styles.commentDot}>•</Text>
            <Text style={styles.commentTime}>{item.time}</Text>
          </View>
        </View>
        {contentEl}
        <View style={styles.commentFooter}>
          <View style={styles.commentFooterLeft}>
            <TouchableOpacity
              style={styles.commentLikeRow}
              onPress={onCommentLike}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome
                name={isCommentLiked ? 'heart' : 'heart-o'}
                size={normalize(13)}
                color={colors.alert}
              />
              <Text style={styles.detailStatText}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.commentReplyButton}
              activeOpacity={0.7}
              onPress={() => onFocusReply?.()}
            >
              <Text style={styles.commentReplyButtonText}>댓글 달기</Text>
            </TouchableOpacity>
          </View>
          <View
            ref={(r) => {
              if (r) commentMenuRefs.current[item.id] = r;
            }}
            collapsable={false}
          >
            <TouchableOpacity
              style={styles.detailMenuBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => openFloatingMenu(item.id, commentMenuRefs.current[item.id])}
            >
              <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    if (isReply) {
      return (
        <View key={item.id} style={styles.commentItemReply}>
          <View style={styles.commentReplyArrow}>
            <Ionicons name="return-down-forward" size={normalize(16)} color={colors.textSecondary} />
          </View>
          {block}
        </View>
      );
    }
    return <View key={item.id} style={styles.commentItem}>{block}</View>;
  };

  const renderCommentTree = (c) => {
    const replies = c.replies || [];
    const flattened = flattenReplies(replies, 0, c.authorLabel);
    const showAllRepliesForThis = expandedReplies[c.id];
    const repliesToShow = showAllRepliesForThis ? flattened : flattened.slice(0, INITIAL_REPLIES);
    const hasMoreReplies = flattened.length > INITIAL_REPLIES && !showAllRepliesForThis;

    const nodes = [
      renderComment(c, false, null, focusReplyInput, {
        liked: commentLikedState[c.id],
        onLike: () => handleCommentLike(c.id),
      }),
    ];
    repliesToShow.forEach(({ reply: r, parentAuthorLabel: parentLabel }) => {
      nodes.push(
        renderComment(r, true, parentLabel, focusReplyInput, {
          liked: commentLikedState[r.id],
          onLike: () => handleCommentLike(r.id),
        })
      );
    });
    if (hasMoreReplies) {
      nodes.push(
        <TouchableOpacity
          key={`more-${c.id}`}
          style={styles.loadMoreRowReply}
          onPress={() => toggleRepliesExpand(c.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={normalize(18)} color={colors.textSecondary} />
          <Text style={styles.loadMoreText}>댓글 더보기</Text>
        </TouchableOpacity>
      );
    }
    if (showAllRepliesForThis && flattened.length > INITIAL_REPLIES) {
      nodes.push(
        <TouchableOpacity
          key={`collapse-${c.id}`}
          style={styles.loadMoreRowReply}
          onPress={() => toggleRepliesExpand(c.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-up" size={normalize(18)} color={colors.textSecondary} />
          <Text style={styles.loadMoreText}>댓글 접기</Text>
        </TouchableOpacity>
      );
    }
    return nodes;
  };

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <SubHeader
            title="게시판"
            onBack={handleBack}
            rightElement={isMyPost ? <Feather name="edit" size={normalize(20)} color={colors.textPrimary} /> : undefined}
            onRightPress={isMyPost ? handleEdit : undefined}
          />

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* 게시글 내용 */}
            <View style={styles.contentSection}>
              <View style={styles.detailHeader}>
                <View style={styles.detailAuthorRow}>
                  <Text
                    style={
                      post.author === '작성자' ? styles.detailAuthor : styles.detailAuthorAnonymous
                    }
                  >
                    {post.author}
                  </Text>
                  <Text style={styles.detailDot}>•</Text>
                  <Text style={styles.detailTime}>{post.time}</Text>
                </View>
                {post.location ? (
                  <View style={styles.detailLocation}>
                    <Ionicons name="location-sharp" size={normalize(12)} color={colors.textSecondary} />
                    <Text style={styles.detailLocationText}>{post.location}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.detailBody}>{post.content}</Text>
              <View style={styles.detailDivider} />
              <View style={styles.detailFooter}>
                <View style={styles.detailStats}>
                  <TouchableOpacity
                    style={styles.detailStatItem}
                    onPress={handlePostLike}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FontAwesome
                      name={postLiked ? 'heart' : 'heart-o'}
                      size={normalize(14)}
                      color={colors.alert}
                    />
                    <Text style={styles.detailStatText}>{post.likes}</Text>
                  </TouchableOpacity>
                  <View style={styles.detailStatItem}>
                    <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                    <Text style={styles.detailStatText}>{post.comments}</Text>
                  </View>
                </View>
                <View ref={postMenuButtonRef} collapsable={false}>
                  <TouchableOpacity
                    style={styles.detailMenuBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => openFloatingMenu('post', postMenuButtonRef.current)}
                  >
                    <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 광고 영역 비움 */}
            <View style={styles.adSection} />

            {/* 댓글: 최상위는 전부 노출, 각 댓글의 대댓글만 3개 제한 후 더보기 */}
            <View style={styles.commentSection}>
              {allComments.map((c) => renderCommentTree(c))}
            </View>
          </ScrollView>

          {/* 하단 댓글 입력 (키보드 올라올 때 paddingBottom 줄여서 홈 인디케이터 영역 덜 보이게) */}
          <View
            style={[
              styles.bottomInputRow,
              isKeyboardVisible && { paddingBottom: normalize(12) },
            ]}
          >
            <TextInput
              ref={bottomInputRef}
              style={styles.bottomInput}
              placeholder="댓글을 입력하세요"
              placeholderTextColor={colors.textSecondary}
              value={bottomComment}
              onChangeText={setBottomComment}
              multiline
              maxLength={1000}
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendComment}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up" size={normalize(22)} color={colors.background} />
            </TouchableOpacity>
          </View>

          {/* 플로팅 메뉴 (boardDetail 인라인) */}
          <Modal
            visible={floatingMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={closeFloatingMenu}
          >
            <TouchableWithoutFeedback onPress={closeFloatingMenu}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  ...(floatingMenuAnchor ? {} : { justifyContent: 'center', alignItems: 'center' }),
                }}
              >
                <TouchableWithoutFeedback>
                  <View
                    style={{
                      backgroundColor: colors.background,
                      borderRadius: normalize(12),
                      minWidth: width * 0.45,
                      maxWidth: width * 0.7,
                      paddingVertical: normalize(4),
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 5,
                      elevation: 5,
                      ...(floatingMenuAnchor
                        ? {
                            position: 'absolute',
                            right: width - floatingMenuAnchor.x,
                            top: floatingMenuAnchor.y,
                          }
                        : {}),
                    }}
                  >
                    {defaultMenuItems.map((item, index) => (
                      <React.Fragment key={index}>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: normalize(10),
                            paddingHorizontal: normalize(14),
                          }}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.onPress) item.onPress();
                            closeFloatingMenu();
                          }}
                        >
                          <Text
                            style={{
                              fontSize: normalize(13),
                              fontFamily: fonts.regular,
                              color: colors.textPrimary,
                            }}
                          >
                            {item.label}
                          </Text>
                          <Ionicons
                            name={item.iconName}
                            size={normalize(17)}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                        {index < defaultMenuItems.length - 1 && (
                          <View
                            style={{
                              height: 1,
                              backgroundColor: colors.textLight10,
                              marginHorizontal: normalize(8),
                            }}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </SafeAreaView>
    </View>
  );
}
