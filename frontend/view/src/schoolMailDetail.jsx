import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SubHeader from '../frame/subHeader';
import Loading from '../../components/Loading';
import CommentInput from '../../components/CommentInput.jsx';
import { colors, fonts } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { createSchoolMailDetailStyles } from '../../styles/SchoolMail.style';
import { api } from '../../utils/api';
import { getSchoolMailFromLabel } from './utils/schoolMailFromLabel';

const INITIAL_REPLIES = 3;

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return String(createdAt);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
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

function filterCommentsTree(comments, deletedSet) {
  if (!comments || !Array.isArray(comments)) return [];
  return comments
    .filter((c) => !deletedSet.has(c.id))
    .map((c) => ({
      ...c,
      replies: c.replies?.length ? filterCommentsTree(c.replies, deletedSet) : [],
    }));
}

function findCommentInTree(nodes, id) {
  if (!nodes?.length) return null;
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findCommentInTree(n.replies, id);
    if (f) return f;
  }
  return null;
}

function bumpLikeInTree(nodes, id, liked, likeCount) {
  if (!nodes?.length) return nodes;
  return nodes.map((n) => {
    if (n.id === id) {
      return { ...n, is_liked: liked, like_count: likeCount, likes: likeCount };
    }
    if (n.replies?.length) {
      return { ...n, replies: bumpLikeInTree(n.replies, id, liked, likeCount) };
    }
    return n;
  });
}

/** API 평면 댓글 → parent_id 기준 트리 */
function buildCommentTree(flat, mailSchoolId) {
  if (!flat?.length) return [];
  const sorted = [...flat].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const map = new Map();
  sorted.forEach((raw) => {
    const authorLabel = getSchoolMailFromLabel(
      { author_school_id: raw.author_school_id, author_school_name: raw.author_school_name, school_id: mailSchoolId },
      mailSchoolId
    );
    map.set(raw.id, {
      ...raw,
      replies: [],
      authorLabel,
      time: formatTimeAgo(raw.created_at),
      likes: Number(raw.like_count ?? 0),
      is_liked: Boolean(raw.is_liked),
      isWriter: false,
    });
  });
  const roots = [];
  sorted.forEach((raw) => {
    const node = map.get(raw.id);
    const pid = raw.parent_id;
    if (pid == null || pid === undefined) {
      roots.push(node);
    } else {
      const parent = map.get(pid);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    }
  });
  return roots;
}

function flattenReplies(replies, depth = 0, parentAuthorLabel = null) {
  const result = [];
  if (!replies?.length) return result;
  for (const r of replies) {
    result.push({ reply: r, depth, parentAuthorLabel });
    if (r.replies?.length) {
      result.push(...flattenReplies(r.replies, depth + 1, r.authorLabel));
    }
  }
  return result;
}

function CommentBody({ content, styles: st }) {
  const text = content ?? '';
  const parts = [];
  let last = 0;
  const regex = /@(익명\d+)/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <Text key={`t-${last}`} style={st.commentBody}>
          {text.slice(last, m.index)}
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
  if (last < text.length) {
    parts.push(
      <Text key={`t-${last}`} style={st.commentBody}>
        {text.slice(last)}
      </Text>
    );
  }
  if (parts.length === 0) {
    return <Text style={st.commentBody}>{text}</Text>;
  }
  return <Text style={st.commentBody}>{parts}</Text>;
}

export default function SchoolMailDetail({ navigation, route }) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createSchoolMailDetailStyles(width, normalize), [width, normalize]);
  const insets = useSafeAreaInsets();

  const schoolName = route?.params?.schoolName;
  const routeSchoolId = route?.params?.schoolId;
  const mailId = route?.params?.mailId;

  const [mail, setMail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [comments, setComments] = useState([]);
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToAuthorLabel, setReplyToAuthorLabel] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const [bottomComment, setBottomComment] = useState('');

  const [postLiked, setPostLiked] = useState(false);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);

  const scrollViewRef = useRef(null);
  const commentLayoutMap = useRef({});
  const inputRef = useRef(null);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});
  const commentWrapperRefs = useRef({});
  const scrollToCommentIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (mailId == null) {
      setLoading(false);
      setError('우편을 찾을 수 없습니다.');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/api/mails/school/${mailId}`);
        const data = res.data?.data;
        if (cancelled) return;
        setMail(data ?? null);
        if (data) {
          setPostLiked(Boolean(data.is_liked));
          try {
            const cr = await api.get(`/api/mails/school/${mailId}/comments`);
            if (cancelled) return;
            const flat = cr.data?.data?.comments ?? [];
            setComments(buildCommentTree(flat, data.school_id));
          } catch (ce) {
            console.error('학교 우편 댓글 로드 실패:', ce?.response?.data || ce.message);
            setComments([]);
          }
        }
        if (!data) setError('우편을 찾을 수 없습니다.');
      } catch (e) {
        if (!cancelled) {
          console.error('학교 우편 상세 로드 실패:', e?.response?.data || e.message);
          setMail(null);
          setError(e?.response?.data?.message ?? '우편을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mailId]);

  const mailBody = mail?.content ?? '';
  const fromLine = getSchoolMailFromLabel(mail, routeSchoolId ?? mail?.school_id);
  const timeLabel = formatTimeAgo(mail?.created_at) || String(mail?.created_at ?? '');

  const visibleComments = useMemo(
    () => filterCommentsTree(comments, new Set(deletedCommentIds)),
    [comments, deletedCommentIds]
  );
  const treeCommentCount = useMemo(() => countCommentsTree(visibleComments), [visibleComments]);
  const displayCommentCount = mail?.comment_count ?? treeCommentCount;

  const commentParseStyles = useMemo(
    () => ({
      commentBody: styles.smDetailCommentBody,
      commentTag: styles.smDetailCommentTag,
    }),
    [styles]
  );

  const scrollToComment = useCallback(
    (commentId) => {
      const yCached = commentLayoutMap.current[commentId];
      const ref = commentWrapperRefs.current[commentId];
      if (scrollViewRef.current && yCached != null) {
        scrollViewRef.current.scrollTo({ y: Math.max(0, yCached - normalize(80)), animated: true });
        return;
      }
      if (ref && scrollViewRef.current) {
        ref.measureLayout(
          scrollViewRef.current,
          (_x, y) => {
            const ly = Math.max(0, y - normalize(80));
            scrollViewRef.current?.scrollTo({ y: ly, animated: true });
          },
          () => {}
        );
      }
    },
    [normalize]
  );

  const openFloatingMenu = (context, ref) => {
    ref?.measureInWindow?.((x, y) => {
      setFloatingMenuAnchor({ x, y });
      setFloatingMenuContext(context);
      setFloatingMenuVisible(true);
    });
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
    setFloatingMenuAnchor(null);
    setFloatingMenuContext(null);
  };

  const handlePostLike = async () => {
    if (mailId == null) return;
    const prevLiked = postLiked;
    const prevCount = Number(mail?.like_count ?? 0);
    setPostLiked((p) => !p);
    setMail((m) =>
      m ? { ...m, like_count: prevCount + (prevLiked ? -1 : 1), is_liked: !prevLiked } : m
    );
    try {
      const res = await api.post(`/api/mails/school/${mailId}/like`);
      const { liked, likeCount } = res.data;
      setPostLiked(Boolean(liked));
      setMail((m) => (m ? { ...m, like_count: likeCount, is_liked: liked } : m));
    } catch (e) {
      setPostLiked(prevLiked);
      setMail((m) => (m ? { ...m, like_count: prevCount, is_liked: prevLiked } : m));
      Alert.alert('오류', e?.response?.data?.message ?? '좋아요 처리에 실패했습니다.');
    }
  };

  const handleCommentLike = async (commentId) => {
    const node = findCommentInTree(comments, commentId);
    if (!node) return;
    const prevLiked = Boolean(node.is_liked);
    const prevCount = Number(node.like_count ?? 0);
    setComments((prev) => bumpLikeInTree(prev, commentId, !prevLiked, prevCount + (prevLiked ? -1 : 1)));
    try {
      const res = await api.post(`/api/mails/school/comments/${commentId}/like`);
      const { liked, likeCount } = res.data;
      setComments((prev) => bumpLikeInTree(prev, commentId, liked, likeCount));
    } catch (e) {
      setComments((prev) => bumpLikeInTree(prev, commentId, prevLiked, prevCount));
      Alert.alert('오류', e?.response?.data?.message ?? '댓글 좋아요 처리에 실패했습니다.');
    }
  };

  const clearReplyTarget = () => {
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
  };

  const focusReplyInput = (commentId, authorLabel) => {
    setReplyToCommentId(commentId);
    const raw = authorLabel != null ? String(authorLabel).replace(/^@/, '') : '';
    setReplyToAuthorLabel(raw ? `@${raw}` : '');
    scrollToCommentIdRef.current = commentId;
    scrollToComment(commentId);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 260);
  };

  useEffect(() => {
    let scrollTimeoutId;
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const onShow = () => {
      const delay = Platform.OS === 'ios' ? 380 : 250;
      scrollTimeoutId = setTimeout(() => {
        const cid = scrollToCommentIdRef.current;
        if (cid) {
          scrollToComment(cid);
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
  }, [scrollToComment]);

  useEffect(() => {
    if (!replyToCommentId) return;
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 520);
    return () => clearTimeout(t);
  }, [replyToCommentId]);

  const toggleRepliesExpand = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleCommentSend = async () => {
    if (!bottomComment.trim() || mailId == null) return;
    try {
      await api.post(`/api/mails/school/${mailId}/comments`, {
        content: bottomComment.trim(),
        parentId: replyToCommentId ?? undefined,
      });
      setBottomComment('');
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
      const [mailRes, comRes] = await Promise.all([
        api.get(`/api/mails/school/${mailId}`),
        api.get(`/api/mails/school/${mailId}/comments`),
      ]);
      const m = mailRes.data?.data;
      setMail(m ?? null);
      if (m) setPostLiked(Boolean(m.is_liked));
      const flat = comRes.data?.data?.comments ?? [];
      setComments(buildCommentTree(flat, m?.school_id));
    } catch (e) {
      Alert.alert('오류', e?.response?.data?.message ?? '댓글 전송에 실패했습니다.');
    }
  };

  const commentMenuItems = useMemo(
    () => [
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
      { label: '차단하기', iconName: 'remove-circle-outline', onPress: () => {} },
    ],
    []
  );

  const showLikes = Number(mail?.like_count ?? 0);

  const renderComment = (item, isReply, onFocusReply) => {
    const isCommentLiked = Boolean(item.is_liked);
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
              onPress={() => handleCommentLike(item.id)}
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
              style={{ padding: normalize(4) }}
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

    const onLayoutComment = () => {
      const r = commentWrapperRefs.current[item.id];
      r?.measureLayout?.(
        scrollViewRef.current,
        (_x, y) => {
          commentLayoutMap.current[item.id] = y;
        },
        () => {}
      );
    };

    if (isReply) {
      return (
        <View
          key={item.id}
          style={styles.smDetailCommentItemReply}
          ref={(r) => {
            if (r) commentWrapperRefs.current[item.id] = r;
          }}
          collapsable={false}
          onLayout={onLayoutComment}
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
        onLayout={onLayoutComment}
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
      renderComment(c, false, () => focusReplyInput(c.id, c.authorLabel)),
    ];
    repliesToShow.forEach(({ reply: r }) => {
      nodes.push(renderComment(r, true, () => focusReplyInput(r.id, r.authorLabel)));
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
    return <React.Fragment key={c.id}>{nodes}</React.Fragment>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="받은 우편" onBack={() => navigation.goBack()} />
        </View>

        <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden' }} pointerEvents="box-none">
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Loading size="large" />
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: normalize(24) }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : (
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
                        {!!schoolName && (
                          <Text
                            style={[styles.smDetailFromToText, { marginTop: normalize(4), opacity: 0.85 }]}
                            numberOfLines={1}
                          >
                            {schoolName}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.smDetailDashedRule} />
                    <Text style={styles.smDetailMailBody}>{mailBody}</Text>
                    <View style={styles.smDetailMailFooter}>
                      <Text style={styles.smDetailMailTime}>{timeLabel}</Text>
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
                          <Text style={styles.smDetailStatText}>{displayCommentCount}</Text>
                        </View>
                        <View ref={postMenuButtonRef} collapsable={false}>
                          <TouchableOpacity
                            style={{ padding: normalize(4) }}
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
                  <Text style={styles.smDetailCommentCountTitle}>댓글 {displayCommentCount}개</Text>
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
                  bottomInputRef={inputRef}
                  bottomComment={bottomComment}
                  setBottomComment={setBottomComment}
                  replyToCommentId={replyToCommentId}
                  replyToAuthorLabel={replyToAuthorLabel}
                  clearReplyTarget={clearReplyTarget}
                  handleSendComment={handleCommentSend}
                  styles={styles}
                  normalize={normalize}
                  mainPlaceholder="댓글 남기기"
                />
              </View>
            </View>
          )}
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
                    floatingMenuContext != null &&
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
                            item.onPress?.();
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
