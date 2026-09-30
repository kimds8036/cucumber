import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  Platform,
  Alert,
  InteractionManager,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import SubHeader from '../frame/subHeader';
import Skeleton from '../../components/common/Skeleton';
import CommentInput from '../../components/CommentInput.jsx';
import ReportModal from '../../components/common/ReportModal.jsx';
import TopAdBanner from '../../components/ads/TopAdBanner';
import { colors, fonts } from '../../styles/colors';
import { createDetailStyles, getNormalize } from '../../styles/board.style';
import { api } from '../../utils/api';
import { usePlatformInsets } from '../../hooks/usePlatformInsets';
import { useRequireStudentVerified } from '../../hooks/useRequireStudentVerified';
import { emitSchoolMailLike, emitSchoolMailDeleted } from '../../utils/listSyncEvents';
import { filterCommentTreeExcludingUser } from '../../utils/blockUser';
import {
  getSchoolMailFromLabel,
  getSchoolMailCommentAuthorLabel,
} from './utils/schoolMailFromLabel';
import BoardPostContent from './board/BoardPostContent';
import BoardCommentTree from './board/BoardCommentTree';
import BoardFloatingMenu from './board/BoardFloatingMenu';

const INITIAL_REPLIES = 0;

function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr =
    typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  if (
    /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) &&
    !/[Z+-]/.test(dateStr)
  ) {
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
      replies: c.replies?.length
        ? filterCommentsTree(c.replies, deletedSet)
        : [],
    }));
}

function findCommentInTree(nodes, id) {
  if (!nodes?.length) return null;
  for (const n of nodes) {
    if (Number(n.id) === Number(id)) return n;
    const f = findCommentInTree(n.replies, id);
    if (f) return f;
  }
  return null;
}

function bumpLikeInTree(nodes, id, liked, likeCount) {
  if (!nodes?.length) return nodes;
  return nodes.map((n) => {
    if (n.id === id) {
      return {
        ...n,
        is_liked: liked,
        liked,
        like_count: likeCount,
        likes: likeCount,
      };
    }
    if (n.replies?.length) {
      return { ...n, replies: bumpLikeInTree(n.replies, id, liked, likeCount) };
    }
    return n;
  });
}

/** API 평면 댓글 → parent_id 기준 트리 (BoardCommentTree가 읽는 필드 포함) */
function buildCommentTree(flat, mailSchoolId, mailAuthorUserId) {
  if (!flat?.length) return [];
  const sorted = [...flat].sort((a, b) => {
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  const map = new Map();
  sorted.forEach((raw) => {
    const authorLabel = getSchoolMailCommentAuthorLabel(
      raw,
      mailSchoolId,
      mailAuthorUserId,
    );
    map.set(raw.id, {
      ...raw,
      userId: raw.user_id,
      replies: [],
      authorLabel,
      time: formatTimeAgo(raw.created_at),
      likes: Number(raw.like_count ?? 0),
      is_liked: Boolean(raw.is_liked),
      liked: Boolean(raw.is_liked),
      isWriter: authorLabel === '작성자',
      isPinned: Boolean(raw.is_pinned),
    });
  });
  const roots = [];
  sorted.forEach((raw) => {
    const node = map.get(raw.id);
    const pid = raw.parent_id;
    if (pid == null) {
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

function buildFlatComments(comments, expandedRepliesMap) {
  const result = [];
  for (const c of comments) {
    result.push({ type: 'comment', data: c });
    const flattened = flattenReplies(c.replies || [], 0, c.authorLabel);
    const isExpanded = expandedRepliesMap[c.id];
    const repliesToShow = isExpanded
      ? flattened
      : flattened.slice(0, INITIAL_REPLIES);
    for (const { reply, parentAuthorLabel } of repliesToShow) {
      result.push({ type: 'reply', data: reply, parentAuthorLabel });
    }
    if (flattened.length > INITIAL_REPLIES && !isExpanded) {
      result.push({
        type: 'more',
        commentId: c.id,
        count: flattened.length - INITIAL_REPLIES,
      });
    }
    if (isExpanded && flattened.length > INITIAL_REPLIES) {
      result.push({ type: 'collapse', commentId: c.id });
    }
  }
  return result;
}

export default function SchoolMailDetail({ navigation, route }) {
  const { allowed, Gate } = useRequireStudentVerified(navigation, {
    message: '학교 우편은 학생인증 후 이용할 수 있어요.',
    reason: 'school_mail',
  });
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createDetailStyles(width, normalize),
    [width, normalize],
  );
  const insets = usePlatformInsets();

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
  const [isSendingComment, setIsSendingComment] = useState(false);

  const [postLiked, setPostLiked] = useState(false);
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTargetType, setReportTargetType] = useState('schoolMail');
  const [reportTargetId, setReportTargetId] = useState(null);
  const [reportReportedUserId, setReportReportedUserId] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  const scrollViewRef = useRef(null);
  const inputRef = useRef(null);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});
  const scrollToCommentIdRef = useRef(null);
  const inputTranslateY = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/auth/me')
      .then((res) => {
        if (!cancelled) setMyUserId(res.data?.data?.id ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!allowed) return undefined;
    if (mailId == null) {
      setLoading(false);
      setError('우편을 찾을 수 없습니다.');
      return undefined;
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
            setComments(buildCommentTree(flat, data.school_id, data.user_id));
          } catch (ce) {
            console.error(
              '학교 우편 댓글 로드 실패:',
              ce?.response?.data || ce.message,
            );
            setComments([]);
          }
        }
        if (!data) setError('우편을 찾을 수 없습니다.');
      } catch (e) {
        if (!cancelled) {
          console.error(
            '학교 우편 상세 로드 실패:',
            e?.response?.data || e.message,
          );
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
  }, [mailId, allowed]);

  const visibleComments = useMemo(
    () => filterCommentsTree(comments, new Set(deletedCommentIds)),
    [comments, deletedCommentIds],
  );
  const flatComments = useMemo(
    () => buildFlatComments(visibleComments, expandedReplies),
    [visibleComments, expandedReplies],
  );
  const treeCommentCount = useMemo(
    () => countCommentsTree(visibleComments),
    [visibleComments],
  );
  const displayCommentCount = mail?.comment_count ?? treeCommentCount;

  const isMailAuthor =
    mail?.user_id != null &&
    myUserId != null &&
    Number(mail.user_id) === Number(myUserId);

  const postForContent = useMemo(
    () => ({
      id: mail?.id,
      author: getSchoolMailFromLabel(mail, routeSchoolId ?? mail?.school_id),
      time: formatTimeAgo(mail?.created_at) || String(mail?.created_at ?? ''),
      location: '',
      content: mail?.content ?? '',
      likes: Number(mail?.like_count ?? 0),
      comments: displayCommentCount,
      images: [],
      tags: [],
    }),
    [mail, routeSchoolId, displayCommentCount],
  );

  const headerTitle = schoolName ? `${schoolName} 우편함` : '학교 우편함';

  const openFloatingMenu = (context, ref) => {
    if (ref?.measureInWindow) {
      ref.measureInWindow((x, y) => {
        setFloatingMenuAnchor({ x, y });
        setFloatingMenuContext(context);
        setFloatingMenuVisible(true);
      });
      return;
    }
    setFloatingMenuAnchor(null);
    setFloatingMenuContext(context);
    setFloatingMenuVisible(true);
  };

  const closeFloatingMenu = () => {
    setFloatingMenuVisible(false);
  };

  const openReportModal = (targetType, targetId, reportedUserId) => {
    if (!targetId) return;
    setReportTargetType(targetType);
    setReportTargetId(targetId);
    setReportReportedUserId(reportedUserId ?? null);
    setReportModalVisible(true);
  };

  const closeReportModal = () => {
    setReportModalVisible(false);
    setReportTargetId(null);
    setReportReportedUserId(null);
    setReportTargetType('schoolMail');
  };

  const handlePostLike = async () => {
    if (mailId == null) return;
    const prevLiked = postLiked;
    const prevCount = Number(mail?.like_count ?? 0);
    setPostLiked((p) => !p);
    setMail((m) =>
      m
        ? {
            ...m,
            like_count: prevCount + (prevLiked ? -1 : 1),
            is_liked: !prevLiked,
          }
        : m,
    );
    try {
      const res = await api.post(`/api/mails/school/${mailId}/like`);
      const { liked, likeCount } = res.data;
      setPostLiked(Boolean(liked));
      setMail((m) =>
        m ? { ...m, like_count: likeCount, is_liked: liked } : m,
      );
      emitSchoolMailLike(mailId, Boolean(liked), likeCount);
    } catch (e) {
      setPostLiked(prevLiked);
      setMail((m) =>
        m ? { ...m, like_count: prevCount, is_liked: prevLiked } : m,
      );
      Alert.alert(
        '오류',
        e?.response?.data?.message ?? '좋아요 처리에 실패했습니다.',
      );
    }
  };

  const handleCommentLike = async (commentId) => {
    const node = findCommentInTree(comments, commentId);
    if (!node) return;
    const prevLiked = Boolean(node.is_liked);
    const prevCount = Number(node.like_count ?? 0);
    setComments((prev) =>
      bumpLikeInTree(
        prev,
        commentId,
        !prevLiked,
        prevCount + (prevLiked ? -1 : 1),
      ),
    );
    try {
      const res = await api.post(
        `/api/mails/school/comments/${commentId}/like`,
      );
      const { liked, likeCount } = res.data;
      setComments((prev) => bumpLikeInTree(prev, commentId, liked, likeCount));
    } catch (e) {
      setComments((prev) =>
        bumpLikeInTree(prev, commentId, prevLiked, prevCount),
      );
      Alert.alert(
        '오류',
        e?.response?.data?.message ?? '댓글 좋아요 처리에 실패했습니다.',
      );
    }
  };

  const scrollToComment = (commentId) => {
    const index = flatComments.findIndex(
      (item) =>
        (item.type === 'comment' || item.type === 'reply') &&
        item.data.id === commentId,
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
      } else if (!replyToCommentId) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, delay);
  };

  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        keyboardOffset.value = Math.max(e.height - insets.bottom, 0);
        inputTranslateY.value = -keyboardOffset.value;
      },
      onEnd: (e) => {
        'worklet';
        keyboardOffset.value = Math.max(e.height - insets.bottom, 0);
        inputTranslateY.value = -keyboardOffset.value;
        if (e.height > 0) {
          runOnJS(handleKeyboardShowScroll)();
        }
      },
    },
    [insets.bottom, replyToCommentId],
  );

  const inputAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputTranslateY.value }],
  }));
  const listAnimStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardOffset.value,
  }));

  const focusReplyInput = (commentId) => {
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
    scrollToCommentIdRef.current = null;
    setTimeout(() => {
      const target = findCommentInTree(comments, commentId);
      setReplyToCommentId(commentId);
      setReplyToAuthorLabel(target?.authorLabel ?? '');
      scrollToCommentIdRef.current = commentId;
    }, 50);
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!replyToCommentId) return undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
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

  const handleCommentSend = async () => {
    if (!bottomComment.trim() || mailId == null || isSendingComment) return;
    const wasReply = Boolean(replyToCommentId);
    setIsSendingComment(true);
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
      setComments(buildCommentTree(flat, m?.school_id, m?.user_id));
      if (!wasReply) {
        setTimeout(
          () => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          },
          Platform.OS === 'ios' ? 120 : 80,
        );
      }
    } catch (e) {
      Alert.alert(
        '오류',
        e?.response?.data?.message ?? '댓글 전송에 실패했습니다.',
      );
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteMail = useCallback(async () => {
    if (!mail?.id) return;
    Alert.alert('삭제', '이 우편을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/mails/school/${mail.id}`);
            emitSchoolMailDeleted(mail.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert(
              '오류',
              e?.response?.data?.message ?? '삭제에 실패했습니다.',
            );
          }
        },
      },
    ]);
  }, [mail?.id, navigation]);

  const handleDeleteComment = useCallback((commentId) => {
    if (!commentId) return;
    Alert.alert('삭제', '댓글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/mails/school/comments/${commentId}`);
            setDeletedCommentIds((prev) => [...prev, commentId]);
          } catch (e) {
            Alert.alert(
              '오류',
              e?.response?.data?.message ?? '삭제에 실패했습니다.',
            );
          }
        },
      },
    ]);
  }, []);

  const handlePinComment = useCallback(
    async (commentId, pin = true) => {
      if (!mail?.id || !commentId) return;
      try {
        await api.patch(
          `/api/mails/school/${mail.id}/comments/${commentId}/pin`,
          { pin },
        );
        const comRes = await api.get(`/api/mails/school/${mail.id}/comments`);
        const flat = comRes.data?.data?.comments ?? [];
        setComments(buildCommentTree(flat, mail.school_id, mail.user_id));
      } catch (e) {
        Alert.alert(
          '오류',
          e?.response?.data?.message ?? '댓글 고정에 실패했습니다.',
        );
      }
    },
    [mail?.id, mail?.school_id, mail?.user_id],
  );

  const buildMenuItems = () => {
    if (floatingMenuContext === 'post') {
      if (isMailAuthor) {
        return [
          {
            label: '삭제하기',
            iconName: 'trash-outline',
            onPress: handleDeleteMail,
          },
        ];
      }
      return [
        {
          label: '신고 / 차단',
          iconName: 'flag-outline',
          onPress: () => {
            if (mail?.user_id) {
              openReportModal('schoolMail', mail.id, mail.user_id);
            }
          },
        },
      ];
    }
    const commentId = floatingMenuContext;
    const comment =
      commentId != null ? findCommentInTree(comments, commentId) : null;
    const items = [];
    if (comment && isMailAuthor) {
      items.push({
        label: comment.isPinned ? '고정 해제' : '댓글 고정',
        iconName: comment.isPinned ? 'pin-off' : 'pin',
        iconSet: 'material-community',
        onPress: () => handlePinComment(commentId, !comment.isPinned),
      });
    }
    items.push({
      label: '답글 달기',
      iconName: 'chatbubble-outline',
      onPress: () => focusReplyInput(commentId),
    });
    const isMyComment =
      comment != null &&
      myUserId != null &&
      Number(comment.userId) === Number(myUserId);
    if (isMyComment) {
      items.push({
        label: '삭제하기',
        iconName: 'trash-outline',
        onPress: () => handleDeleteComment(commentId),
      });
    } else {
      items.push({
        label: '신고 / 차단',
        iconName: 'flag-outline',
        onPress: () => {
          if (!comment?.userId) return;
          openReportModal('schoolMailComment', commentId, comment.userId);
        },
      });
    }
    return items;
  };

  const commentTree = BoardCommentTree({
    flatComments,
    commentLikedState: {},
    replyToCommentId,
    onCommentLike: handleCommentLike,
    onToggleReplies: toggleRepliesExpand,
    onOpenMenu: openFloatingMenu,
    commentMenuRefs,
    styles,
    normalize,
  });

  if (!allowed) return <Gate />;

  const renderSkeleton = () => (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.white,
      }}
    >
      <View style={styles.contentSection}>
        <View style={{ flexDirection: 'row', marginBottom: normalize(8) }}>
          <Skeleton
            width={normalize(52)}
            height={normalize(12)}
            borderRadius={normalize(6)}
          />
          <View style={{ width: normalize(8) }} />
          <Skeleton
            width={normalize(68)}
            height={normalize(12)}
            borderRadius={normalize(6)}
          />
        </View>
        <Skeleton
          width="100%"
          height={normalize(14)}
          borderRadius={normalize(6)}
          style={{ marginBottom: normalize(6) }}
        />
        <Skeleton
          width="90%"
          height={normalize(14)}
          borderRadius={normalize(6)}
          style={{ marginBottom: normalize(10) }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: normalize(14),
          }}
        >
          <Skeleton
            width={normalize(34)}
            height={normalize(14)}
            borderRadius={normalize(6)}
          />
          <Skeleton
            width={normalize(34)}
            height={normalize(14)}
            borderRadius={normalize(6)}
          />
        </View>
      </View>
      <View style={styles.adSection}>
        <View style={styles.adSectionRow}>
          <Skeleton
            width={normalize(28)}
            height={normalize(16)}
            borderRadius={normalize(8)}
          />
          <Skeleton
            width="72%"
            height={normalize(14)}
            borderRadius={normalize(6)}
          />
        </View>
      </View>
      <View style={styles.commentSection}>
        {[0, 1, 2].map((idx) => (
          <View key={`mail-detail-comment-skel-${idx}`} style={styles.commentItem}>
            <Skeleton
              width={normalize(120)}
              height={normalize(11)}
              borderRadius={normalize(6)}
              style={{ marginBottom: normalize(8) }}
            />
            <Skeleton
              width="100%"
              height={normalize(13)}
              borderRadius={normalize(6)}
              style={{ marginBottom: normalize(6) }}
            />
            <Skeleton
              width={normalize(140)}
              height={normalize(11)}
              borderRadius={normalize(6)}
              style={{ marginBottom: normalize(12) }}
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View
          style={{
            zIndex: 1,
            elevation: 0,
            backgroundColor: colors.white,
          }}
        >
          <SubHeader title={headerTitle} onBack={() => navigation.goBack()} />
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.white,
            overflow: 'hidden',
            zIndex: 0,
          }}
          pointerEvents="box-none"
        >
          {error && !loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: normalize(24),
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.regular,
                  color: colors.textLight4,
                  textAlign: 'center',
                }}
              >
                {error}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'column' }}>
              <Animated.View style={[{ flex: 1 }, listAnimStyle]}>
                <FlatList
                  ref={scrollViewRef}
                  style={[{ flex: 1 }, loading && { opacity: 0 }]}
                  pointerEvents={loading ? 'none' : 'auto'}
                  data={flatComments}
                  keyExtractor={commentTree.keyExtractor}
                  renderItem={commentTree.renderItem}
                  ListHeaderComponent={
                    mail ? (
                      <View>
                        <BoardPostContent
                          post={postForContent}
                          postLiked={postLiked}
                          onLike={handlePostLike}
                          onMenu={() =>
                            openFloatingMenu('post', postMenuButtonRef.current)
                          }
                          styles={styles}
                          normalize={normalize}
                          postMenuButtonRef={postMenuButtonRef}
                          showDistanceBadge={false}
                          hideScrap
                          hidePoll
                        />
                        <TopAdBanner placement="board" />
                        <View style={styles.commentGutter}>
                          <View style={styles.commentListHeader}>
                            <Text style={styles.commentListHeaderText}>
                              댓글
                            </Text>
                            <Text style={styles.commentListHeaderText}>
                              {displayCommentCount}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null
                  }
                  contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: 0 },
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
              </Animated.View>
              {loading ? renderSkeleton() : null}

              <Animated.View
                style={[
                  {
                    backgroundColor: colors.white,
                    paddingBottom: Math.max(insets.bottom, normalize(12)),
                  },
                  inputAnimStyle,
                ]}
              >
                <CommentInput
                  bottomInputRef={inputRef}
                  bottomComment={bottomComment}
                  setBottomComment={setBottomComment}
                  showImageAttach={false}
                  replyToCommentId={replyToCommentId}
                  replyToAuthorLabel={replyToAuthorLabel}
                  clearReplyTarget={clearReplyTarget}
                  handleSendComment={handleCommentSend}
                  isSendingComment={isSendingComment}
                  styles={styles}
                  normalize={normalize}
                />
              </Animated.View>
            </View>
          )}
        </View>

        <BoardFloatingMenu
          visible={floatingMenuVisible}
          anchor={floatingMenuAnchor}
          context={floatingMenuContext}
          items={floatingMenuVisible ? buildMenuItems() : []}
          onClose={closeFloatingMenu}
          styles={styles}
          normalize={normalize}
          width={width}
        />

        <ReportModal
          visible={reportModalVisible}
          onClose={closeReportModal}
          targetType={reportTargetType}
          targetId={reportTargetId}
          reportedUserId={reportReportedUserId}
          onBlocked={(uid) => {
            if (reportTargetType === 'schoolMailComment') {
              setComments((prev) => filterCommentTreeExcludingUser(prev, uid));
            } else if (reportTargetType === 'schoolMail') {
              navigation?.goBack?.();
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
