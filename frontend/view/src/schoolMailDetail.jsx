import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailDetailStyles } from '../../styles/SchoolMail.style';

function CommentBody({ content, styles: st }) {
  const parts = [];
  let last = 0;
  const regex = /@(익명\d+)/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      parts.push(
        <Text key={`t-${last}`} style={st.commentBody}>
          {content.slice(last, m.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={`tag-${m.index}`} style={[st.commentBody, st.commentTag]}>
        @{m[1]}
      </Text>
    );
    last = regex.lastIndex;
  }
  if (last < content.length) {
    parts.push(
      <Text key={`t-${last}`} style={st.commentBody}>
        {content.slice(last)}
      </Text>
    );
  }
  if (parts.length === 0) {
    return <Text style={st.commentBody}>{content}</Text>;
  }
  return <Text style={st.commentBody}>{parts}</Text>;
}

function countCommentsTree(comments) {
  if (!comments?.length) return 0;
  let n = 0;
  for (const c of comments) {
    n += 1;
    n += countCommentsTree(c.replies);
  }
  return n;
}

/** 우편 id별 더미 댓글 (API 연동 시 교체) */
const COMMENTS_BY_MAIL_ID = {
  1: [
    {
      id: 'sm1-c1',
      authorLabel: '익명1',
      isWriter: false,
      time: '2시간 전',
      content: '시험 범위 공지 감사합니다!',
      likes: 2,
      replies: [
        {
          id: 'sm1-c1-1',
          authorLabel: '익명2',
          isWriter: false,
          time: '1시간 전',
          content: '저도요 화이팅',
          likes: 1,
          replies: [],
        },
      ],
    },
    {
      id: 'sm1-c2',
      authorLabel: '익명3',
      isWriter: false,
      time: '1시간 전',
      content: '중간고사 화이팅이에요',
      likes: 1,
      replies: [],
    },
  ],
  2: [
    {
      id: 'sm2-c1',
      authorLabel: '익명1',
      isWriter: false,
      time: '20시간 전',
      content: '체육대회 신청 어디서 하나요?',
      likes: 0,
      replies: [],
    },
  ],
  3: [],
  4: [
    {
      id: 'sm4-c1',
      authorLabel: '익명1',
      isWriter: false,
      time: '2일 전',
      content: '일정 확인했어요',
      likes: 1,
      replies: [],
    },
    {
      id: 'sm4-c2',
      authorLabel: '익명2',
      isWriter: false,
      time: '2일 전',
      content: '과목별 범위도 올려주세요',
      likes: 0,
      replies: [],
    },
  ],
};

export default function SchoolMailDetail({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolMailDetailStyles(width, normalize), [width, normalize]);
  const insets = useSafeAreaInsets();

  const schoolName = route?.params?.schoolName ?? 'OO고등학교';
  const mail = route?.params?.mail ?? {
    id: 0,
    preview: '',
    content: '우편 내용이 없습니다.',
    fromLabel: '익명',
    time: '',
    likes: 0,
    comments: 0,
  };

  const mailBody = mail.content ?? mail.preview ?? '';
  const fromLine = mail.fromLabel ?? '익명';

  const baseComments = useMemo(
    () => COMMENTS_BY_MAIL_ID[mail.id] ?? [],
    [mail.id]
  );

  const [postLiked, setPostLiked] = useState(false);
  const [commentLikedState, setCommentLikedState] = useState({});
  const [bottomComment, setBottomComment] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToAuthorLabel, setReplyToAuthorLabel] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);

  const bottomInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});
  const commentWrapperRefs = useRef({});
  const scrollToCommentIdRef = useRef(null);
  const INITIAL_REPLIES = 3;

  const commentParseStyles = useMemo(
    () => ({
      commentBody: styles.smDetailCommentBody,
      commentTag: styles.smDetailCommentTag,
    }),
    [styles]
  );

  const filterCommentsTree = (comments, deletedSet) => {
    if (!comments || !Array.isArray(comments)) return [];
    return comments
      .filter((c) => !deletedSet.has(c.id))
      .map((c) => ({
        ...c,
        replies: c.replies?.length ? filterCommentsTree(c.replies, deletedSet) : [],
      }));
  };

  const visibleComments = useMemo(
    () => filterCommentsTree(baseComments, new Set(deletedCommentIds)),
    [baseComments, deletedCommentIds]
  );

  const commentCount = useMemo(() => countCommentsTree(visibleComments), [visibleComments]);

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

  const scrollToComment = (commentId) => {
    const ref = commentWrapperRefs.current[commentId];
    if (ref && scrollViewRef.current) {
      ref.measureLayout(
        scrollViewRef.current,
        (_x, y) => {
          const offset = Math.max(0, y - normalize(80));
          scrollViewRef.current?.scrollTo({ y: offset, animated: true });
        },
        () => {}
      );
    }
  };

  useEffect(() => {
    let scrollTimeoutId;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const onShow = () => {
      const delay = Platform.OS === 'ios' ? 380 : 250;
      scrollTimeoutId = setTimeout(() => {
        const commentId = scrollToCommentIdRef.current;
        if (commentId) {
          scrollToComment(commentId);
          scrollToCommentIdRef.current = null;
        } else {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }, delay);
    };
    const subShow = Keyboard.addListener(showEvent, onShow);
    return () => {
      if (scrollTimeoutId) clearTimeout(scrollTimeoutId);
      subShow.remove();
    };
  }, []);

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

  const focusReplyInput = (commentId) => {
    if (commentId != null) {
      const target = findCommentById(baseComments, commentId);
      setReplyToCommentId(commentId);
      setReplyToAuthorLabel(target?.authorLabel ?? '');
      scrollToCommentIdRef.current = commentId;
    } else {
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
      scrollToCommentIdRef.current = null;
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
    setTimeout(() => {
      bottomInputRef.current?.focus();
    }, 260);
  };

  const clearReplyTarget = () => {
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
  };

  useEffect(() => {
    if (!replyToCommentId) return;
    const backup = setTimeout(() => {
      bottomInputRef.current?.focus();
    }, 520);
    return () => clearTimeout(backup);
  }, [replyToCommentId]);

  const toggleRepliesExpand = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handlePostLike = () => setPostLiked((p) => !p);

  const handleCommentLike = (commentId) => {
    setCommentLikedState((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleSendComment = () => {
    if (!bottomComment.trim()) return;
    setBottomComment('');
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
  };

  const commentMenuItems = useMemo(
    () => [
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
    ],
    []
  );

  const flattenReplies = (replies, depth = 0, parentAuthorLabel = null) => {
    const result = [];
    for (const r of replies) {
      result.push({ reply: r, depth, parentAuthorLabel });
      if (r.replies?.length) {
        result.push(...flattenReplies(r.replies, depth + 1, r.authorLabel));
      }
    }
    return result;
  };

  const renderComment = (item, isReply = false, onFocusReply, likeState = {}) => {
    const isCommentLiked = likeState.liked ?? false;
    const onCommentLike = likeState.onLike;
    const AuthorLabel = item.isWriter ? (
      <Text style={styles.smDetailCommentAuthorWriter}>{item.authorLabel}</Text>
    ) : (
      <Text style={styles.smDetailCommentAuthor}>{item.authorLabel}</Text>
    );

    const bodyHasTag = /@익명\d+/.test(item.content);
    const contentEl = bodyHasTag ? (
      <CommentBody content={item.content} styles={commentParseStyles} />
    ) : (
      <Text style={styles.smDetailCommentBody}>{item.content}</Text>
    );

    const block = (
      <View style={isReply ? styles.smDetailCommentReplyBody : undefined}>
        <View style={styles.smDetailCommentRow}>
          <View style={styles.smDetailCommentAuthorRow}>
            {AuthorLabel}
            <Text style={styles.smDetailCommentDot}>•</Text>
            <Text style={styles.smDetailCommentTime}>{item.time}</Text>
          </View>
        </View>
        {contentEl}
        <View style={styles.smDetailCommentFooter}>
          <View style={styles.smDetailCommentFooterLeft}>
            <TouchableOpacity
              style={styles.smDetailCommentLikeRow}
              onPress={onCommentLike}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome
                name={isCommentLiked ? 'heart' : 'heart-o'}
                size={normalize(13)}
                color={colors.alert}
              />
              <Text style={styles.smDetailStatText}>{item.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smDetailCommentReplyButton}
              activeOpacity={0.7}
              onPress={() => onFocusReply?.()}
            >
              <Text style={styles.smDetailCommentReplyButtonText}>댓글 달기</Text>
            </TouchableOpacity>
          </View>
          <View
            ref={(r) => {
              if (r) commentMenuRefs.current[item.id] = r;
            }}
            collapsable={false}
          >
            <TouchableOpacity
              style={styles.smDetailMenuBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => openFloatingMenu(item.id, commentMenuRefs.current[item.id])}
            >
              <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );

    const isReplyingToThis = replyToCommentId === item.id;
    const bubble = (
      <View
        style={[
          styles.smDetailCommentBubble,
          isReply && styles.smDetailCommentBubbleReply,
          isReplyingToThis && styles.smDetailCommentBubbleReplying,
        ]}
      >
        {block}
      </View>
    );

    if (isReply) {
      return (
        <View
          key={item.id}
          style={styles.smDetailCommentItemReply}
          ref={(r) => {
            if (r) commentWrapperRefs.current[item.id] = r;
          }}
          collapsable={false}
        >
          <View style={styles.smDetailCommentReplyArrow}>
            <Ionicons name="return-down-forward" size={normalize(16)} color={colors.textSecondary} />
          </View>
          {bubble}
        </View>
      );
    }
    return (
      <View
        key={item.id}
        style={styles.smDetailCommentItem}
        ref={(r) => {
          if (r) commentWrapperRefs.current[item.id] = r;
        }}
        collapsable={false}
      >
        {bubble}
      </View>
    );
  };

  const renderCommentTree = (c) => {
    const replies = c.replies || [];
    const flattened = flattenReplies(replies, 0, c.authorLabel);
    const showAllRepliesForThis = expandedReplies[c.id];
    const repliesToShow = showAllRepliesForThis ? flattened : flattened.slice(0, INITIAL_REPLIES);
    const hasMoreReplies = flattened.length > INITIAL_REPLIES && !showAllRepliesForThis;

    const nodes = [
      renderComment(c, false, () => focusReplyInput(c.id), {
        liked: commentLikedState[c.id],
        onLike: () => handleCommentLike(c.id),
      }),
    ];
    repliesToShow.forEach(({ reply: r }) => {
      nodes.push(
        renderComment(r, true, () => focusReplyInput(r.id), {
          liked: commentLikedState[r.id],
          onLike: () => handleCommentLike(r.id),
        })
      );
    });
    if (hasMoreReplies) {
      nodes.push(
        <TouchableOpacity
          key={`more-${c.id}`}
          style={styles.smDetailLoadMoreRowReply}
          onPress={() => toggleRepliesExpand(c.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={normalize(18)} color={colors.textSecondary} />
          <Text style={styles.smDetailLoadMoreText}>댓글 더보기</Text>
        </TouchableOpacity>
      );
    }
    if (showAllRepliesForThis && flattened.length > INITIAL_REPLIES) {
      nodes.push(
        <TouchableOpacity
          key={`collapse-${c.id}`}
          style={styles.smDetailLoadMoreRowReply}
          onPress={() => toggleRepliesExpand(c.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-up" size={normalize(18)} color={colors.textSecondary} />
          <Text style={styles.smDetailLoadMoreText}>댓글 접기</Text>
        </TouchableOpacity>
      );
    }
    return nodes;
  };

  const showLikes = mail.likes + (postLiked ? 1 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="받은 우편" onBack={() => navigation.goBack()} />
        </View>

        <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }} pointerEvents="box-none">
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.smDetailScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.smDetailLetterWrap}>
                <View style={styles.smDetailLetterCard}>
                  <View style={styles.smDetailLetterTopRow}>
                    <View style={styles.smDetailFromToCol}>
                      <Text style={styles.smDetailFromToText}>From. {fromLine}</Text>
                    </View>
                  </View>
                  <View style={styles.smDetailDashedRule} />
                  <Text style={styles.smDetailMailBody}>{mailBody}</Text>
                  <View style={styles.smDetailMailFooter}>
                    <Text style={styles.smDetailMailTime}>{mail.time}</Text>
                    <View style={styles.smDetailMailStats}>
                      <TouchableOpacity
                        style={styles.smDetailStatItem}
                        onPress={handlePostLike}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <FontAwesome
                          name={postLiked ? 'heart' : 'heart-o'}
                          size={normalize(14)}
                          color={colors.alert}
                        />
                        <Text style={styles.smDetailStatText}>{showLikes}</Text>
                      </TouchableOpacity>
                      <View style={styles.smDetailStatItem}>
                        <Ionicons name="chatbubble-outline" size={normalize(15)} color={colors.primary} />
                        <Text style={styles.smDetailStatText}>{commentCount}</Text>
                      </View>
                      <View ref={postMenuButtonRef} collapsable={false}>
                        <TouchableOpacity
                          style={styles.smDetailMenuBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => openFloatingMenu('post', postMenuButtonRef.current)}
                        >
                          <Entypo name="dots-three-vertical" size={normalize(14)} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.smDetailCommentSection}>
                <Text style={styles.smDetailCommentCountTitle}>댓글 {commentCount}개</Text>
                {visibleComments.map((c) => renderCommentTree(c))}
              </View>
            </ScrollView>

            <View
              style={{
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, normalize(12)),
              }}
            >
              <CommentInput
                bottomInputRef={bottomInputRef}
                bottomComment={bottomComment}
                setBottomComment={setBottomComment}
                replyToCommentId={replyToCommentId}
                replyToAuthorLabel={replyToAuthorLabel}
                clearReplyTarget={clearReplyTarget}
                handleSendComment={handleSendComment}
                styles={styles}
                normalize={normalize}
                mainPlaceholder="댓글 남기기"
              />
            </View>
          </View>
        </View>

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
                  {floatingMenuContext === 'post' &&
                    ['신고하기', '차단하기', '공유하기'].map((label, index) => (
                      <React.Fragment key={label}>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: normalize(10),
                            paddingHorizontal: normalize(14),
                          }}
                          activeOpacity={0.7}
                          onPress={closeFloatingMenu}
                        >
                          <Text
                            style={{
                              fontSize: normalize(13),
                              fontFamily: fonts.regular,
                              color: colors.textPrimary,
                            }}
                          >
                            {label}
                          </Text>
                          <Ionicons
                            name={
                              index === 0 ? 'flag-outline' : index === 1 ? 'remove-circle-outline' : 'share-outline'
                            }
                            size={normalize(17)}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                        {index < 2 && (
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
                  {floatingMenuContext !== 'post' &&
                    floatingMenuContext &&
                    commentMenuItems.map((item, index) => (
                      <React.Fragment key={item.label}>
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
                            if (item.label === '신고하기') closeFloatingMenu();
                            else if (item.label === '차단하기') closeFloatingMenu();
                            else item.onPress?.();
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
                          <Ionicons name={item.iconName} size={normalize(17)} color={colors.textSecondary} />
                        </TouchableOpacity>
                        {index < commentMenuItems.length - 1 && (
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
