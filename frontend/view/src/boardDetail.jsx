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
  Alert,
  Keyboard,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Entypo } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import CommentInput from '../../components/CommentInput.jsx';
import { colors, fonts } from '../../styles/colors';
import { createDetailStyles, getNormalize } from '../../styles/board.style';
import { api } from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';

/** 서버 created_at(UTC)을 "n분 전" 형식으로 변환. 화면에서는 기기 로컬 시간 기준으로 계산 */
function formatTimeAgo(createdAt) {
  if (!createdAt) return '';
  let dateStr = typeof createdAt === 'string' ? createdAt.trim() : String(createdAt);
  if (!dateStr) return '';
  // MySQL "YYYY-MM-DD HH:mm:ss" 형태이고 타임존 문자가 없으면 UTC로 간주해 Z(=+00:00) 를 붙인다.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(dateStr) && !/[Z+-]/.test(dateStr)) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
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

  const initialPost = route?.params?.post ?? {
    id: 1,
    author: '작성자',
    time: '2시간 전',
    location: '24m',
    content:
      '중간고사 D-72 같이 공부하실 분? 시험기간인데 혼자 공부하니까 집중이 안 돼서요. 온라인으로라도 같이 공부하실 분 있나요? 디스코드 공부방 만들까 생각 중임',
    likes: 213,
    comments: 89,
    liked: false,
    scraps: 0,
  };
  const routePost = route?.params?.post;
  const routePostId = route?.params?.postId;

  const [post, setPost] = useState(() => {
    const fromParams = routePost != null;
    const isMy = route?.params?.isMyPost === true;
    const base = fromParams ? { ...initialPost, ...routePost } : initialPost;
    return {
      ...base,
      id: routePostId ?? base.id,
      author: fromParams ? (isMy ? '작성자' : '익명') : initialPost.author,
    };
  });

  const isMyPost = route?.params?.isMyPost ?? false;
  const [isMyPostFromApi, setIsMyPostFromApi] = useState(isMyPost);
  const [postLiked, setPostLiked] = useState(initialPost.liked ?? false);
  const [postScrapped, setPostScrapped] = useState(Boolean(post?.isScrapped));
  const [commentLikedState, setCommentLikedState] = useState({});
  const [bottomComment, setBottomComment] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState(null);
  const [replyToAuthorLabel, setReplyToAuthorLabel] = useState('');
  const bottomInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const INITIAL_REPLIES = 3;
  const [expandedReplies, setExpandedReplies] = useState({});
  const insets = useSafeAreaInsets();
  const [floatingMenuVisible, setFloatingMenuVisible] = useState(false);
  const [floatingMenuContext, setFloatingMenuContext] = useState(null);
  const [floatingMenuAnchor, setFloatingMenuAnchor] = useState(null);
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const postMenuButtonRef = useRef(null);
  const commentMenuRefs = useRef({});
  const commentWrapperRefs = useRef({});
  const scrollToCommentIdRef = useRef(null);

  const [allComments, setAllComments] = useState([]);
  const [postAuthorId, setPostAuthorId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { refreshHasUnread } = useNotification();

  // 게시글/댓글 로드
  useEffect(() => {
    const postId = routePostId ?? post?.id ?? initialPost?.id;
    if (!postId) return;

    const fetchPostAndComments = async () => {
      try {
        // 게시글 상세
        const postRes = await api.get(`/api/posts/${postId}`);
        const data = postRes.data?.data;
        if (data) {
          setPost({
            id: data.id,
            author: data.isMine ? '작성자' : '익명',
            time: formatTimeAgo(data.created_at),
            location: data.location ?? '',
            content: data.content,
            likes: data.like_count,
            comments: data.comment_count,
            scraps: data.scrapCount ?? 0,
          });
          setPostLiked(Boolean(data.isLiked));
          setPostScrapped(Boolean(data.isScrapped));
          if (data.isMine !== undefined) setIsMyPostFromApi(data.isMine);
          if (data.post_author_id != null) setPostAuthorId(data.post_author_id);
          if (data.current_user_id != null) setCurrentUserId(data.current_user_id);
        }

        // 댓글 목록
        const commentRes = await api.get(`/api/${postId}/comments`);
        const comments = commentRes.data?.data?.comments || [];
        const postAuthorIdForTree = postRes.data?.data?.post_author_id ?? null;
        const currentUserIdForTree = postRes.data?.data?.current_user_id ?? null;

        const buildTree = () => {
          const nodes = new Map();
          comments.forEach((c) => {
            const isPostAuthor = postAuthorIdForTree != null && c.user_id === postAuthorIdForTree;
            nodes.set(c.id, {
              id: c.id,
              userId: c.user_id,
              authorLabel: isPostAuthor ? '작성자' : `익명 ${c.anonymous_index}`,
              isWriter: isPostAuthor,
              isMyComment: currentUserIdForTree != null && c.user_id === currentUserIdForTree,
              time: formatTimeAgo(c.created_at),
              content: c.content,
              likes: c.like_count,
              replies: [],
            });
          });

          const roots = [];
          comments.forEach((c) => {
            const node = nodes.get(c.id);
            if (c.parent_comment_id) {
              const parent = nodes.get(c.parent_comment_id);
              if (parent) {
                parent.replies.push(node);
              } else {
                roots.push(node);
              }
            } else {
              roots.push(node);
            }
          });
          return roots;
        };

        setAllComments(buildTree());

        // 이 게시글과 연결된 알림을 모두 읽음 처리 (게시글 상세를 본 것으로 간주)
        try {
          await api.post('/api/notifications/read-by-related', {
            relatedType: 'post',
            relatedId: postId,
          });
          refreshHasUnread();
        } catch (e) {
          console.error('게시글 관련 알림 읽음 처리 실패:', e);
        }
      } catch (error) {
        console.error('게시글/댓글 로드 실패:', error);
        Alert.alert(
          '오류',
          error.response?.data?.message || '게시글을 불러오는 중 오류가 발생했습니다.'
        );
      }
    };

    fetchPostAndComments();
  }, [initialPost?.id]);

  const startNoteToUser = async (targetUserId, source) => {
    if (!targetUserId || !post?.id) {
      console.error(
        '[BoardDetail] 쪽지 전송 불가 - 잘못된 파라미터',
        { targetUserId, postId: post?.id, source }
      );
      Alert.alert('오류', '쪽지를 보낼 수 없습니다.');
      return;
    }
    try {
      console.log('[BoardDetail] 쪽지방 생성 요청', {
        postId: post.id,
        otherUserId: targetUserId,
        source,
      });
      const res = await api.post('/api/messages/rooms', {
        postId: post.id,
        otherUserId: targetUserId,
      });
      console.log('[BoardDetail] 쪽지방 생성 응답', res.data);
      const room = res.data?.data;
      if (!room?.id) {
        console.error('[BoardDetail] 쪽지방 데이터 이상', res.data);
        Alert.alert('오류', '쪽지 방 정보를 불러올 수 없습니다.');
        return;
      }
      navigation.navigate('Chat', { roomId: room.id });
    } catch (error) {
      console.error('[BoardDetail] 쪽지방 생성/조회 실패:', error?.response?.data || error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '쪽지방을 여는 중 오류가 발생했습니다.'
      );
    }
  };

  const handleSharePost = async () => {
    if (!post?.id) return;
    const url = `${api.defaults.baseURL}/posts/${post.id}`;
    try {
      await Share.share({
        message: `오늘의 이야기 게시글을 공유합니다.\n\n${url}`,
        url,
        title: '오늘의 이야기 게시글',
      });
    } catch (error) {
      console.error('게시글 공유 실패:', error);
    }
  };

  // 게시글용 메뉴 (다른 사람 글)
  const postMenuItemsOthers = useMemo(
    () => [
      {
        label: '쪽지 보내기',
        iconName: 'chatbubble-outline',
        onPress: () => {
          console.log('[BoardDetail] 쪽지 메뉴 클릭', {
            postAuthorId,
            currentUserId,
          });
          if (postAuthorId && currentUserId && postAuthorId === currentUserId) {
            Alert.alert('안내', '자기 자신에게는 쪽지를 보낼 수 없습니다.');
            return;
          }
          startNoteToUser(postAuthorId, 'post');
        },
      },
      {
        label: '공유하기',
        iconName: 'share-outline',
        onPress: handleSharePost,
      },
      { label: '신고하기', iconName: 'flag-outline', onPress: () => {} },
    ],
    [postAuthorId, currentUserId, handleSharePost]
  );

  // 댓글용 메뉴 (다른 사람 댓글) - 차단하기 제외
  const commentMenuItemsOthers = useMemo(
    () => [
      { label: '쪽지 보내기', iconName: 'chatbubble-outline' },
      { label: '신고하기', iconName: 'flag-outline' },
    ],
    []
  );

  // allComments는 서버에서 로드한 트리 구조를 사용

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

  const visibleComments = useMemo(
    () => filterCommentsTree(allComments ?? [], new Set(deletedCommentIds)),
    [allComments, deletedCommentIds]
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

  // 키보드 올라온 뒤 지연 스크롤만 수행 (state 없이 → 리렌더 없음, 포커스 유지. 입력창 올림은 전역 Animated)
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

  const focusReplyInput = (commentId) => {
    if (commentId != null) {
      const target = findCommentById(allComments, commentId);
      setReplyToCommentId(commentId);
      setReplyToAuthorLabel(target?.authorLabel ?? '');
      scrollToCommentIdRef.current = commentId;
      // 스크롤은 키보드가 뜬 뒤 리스너에서 수행 (즉시 스크롤 시 키보드가 안 뜨는 현상 방지)
    } else {
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
      scrollToCommentIdRef.current = null;
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
    // 포커스 지연: 상태 반영 후 입력창에 포커스 (간헐적 미동작 방지)
    setTimeout(() => {
      bottomInputRef.current?.focus();
    }, 260);
  };

  const clearReplyTarget = () => {
    setReplyToCommentId(null);
    setReplyToAuthorLabel('');
  };

  // 댓글/대댓글 달기 누른 뒤 키보드가 간헐적으로 안 뜨는 경우 백업 포커스
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

  const handleBack = () => navigation.goBack();
  const handleEdit = () => {}; // TODO

  const handleDeletePost = () => {
    closeFloatingMenu();
    Alert.alert(
      '게시글 삭제',
      '이 게시글을 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/posts/${post.id}`);
              Alert.alert('삭제됨', '게시글이 삭제되었습니다.', [
                { text: '확인', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('게시글 삭제 오류:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message || '게시글 삭제 중 오류가 발생했습니다.'
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteComment = (commentId) => {
    closeFloatingMenu();
    Alert.alert(
      '댓글 삭제',
      '이 댓글을 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/comments/${commentId}`);
              setDeletedCommentIds((prev) => [...prev, commentId]);
              setPost((prev) =>
                prev ? { ...prev, comments: Math.max(0, (prev.comments || 0) - 1) } : prev
              );
              Alert.alert('삭제됨', '댓글이 삭제되었습니다.');
            } catch (error) {
              console.error('댓글 삭제 오류:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message || '댓글 삭제 중 오류가 발생했습니다.'
              );
            }
          },
        },
      ]
    );
  };

  const handlePostLike = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/like`);
      const isLiked = res.data?.data?.isLiked;
      setPostLiked(Boolean(isLiked));
      setPost((prev) =>
        prev
          ? {
              ...prev,
              likes: prev.likes + (isLiked ? 1 : -1),
            }
          : prev
      );
    } catch (error) {
      console.error('게시글 좋아요 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '좋아요 처리 중 오류가 발생했습니다.'
      );
    }
  };

  const handlePostScrap = async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/scrap`);
      const scrapped = res.data?.scrapped;
      setPostScrapped(Boolean(scrapped));
      setPost((prev) => {
        const cur = prev?.scraps ?? 0;
        const next = scrapped ? cur + 1 : Math.max(0, cur - 1);
        return prev ? { ...prev, scraps: next } : prev;
      });
    } catch (error) {
      console.error('게시글 스크랩 오류:', error);
      Alert.alert('오류', '스크랩 처리 중 오류가 발생했습니다.');
    }
  };

  const handleCommentLike = async (commentId) => {
    try {
      const res = await api.post(`/api/${commentId}/like`);
      const isLiked = res.data?.data?.isLiked;
      setCommentLikedState((prev) => ({ ...prev, [commentId]: Boolean(isLiked) }));
      setAllComments((prev) =>
        prev.map((c) => {
          const updateNode = (node) => {
            if (node.id === commentId) {
              return {
                ...node,
                likes: node.likes + (isLiked ? 1 : -1),
              };
            }
            if (node.replies?.length) {
              return { ...node, replies: node.replies.map(updateNode) };
            }
            return node;
          };
          return updateNode(c);
        })
      );
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '댓글 좋아요 처리 중 오류가 발생했습니다.'
      );
    }
  };

  const handleSendComment = async () => {
    if (!bottomComment.trim()) return;
    try {
      const payload = {
        content: bottomComment.trim(),
      };
      if (replyToCommentId) {
        payload.parentCommentId = replyToCommentId;
      }
      const res = await api.post(`/api/${post.id}/comments`, payload);
      const c = res.data?.data;
      if (c) {
        // 간단히 전체 댓글을 다시 로드
        const commentRes = await api.get(`/api/${post.id}/comments`);
        const comments = commentRes.data?.data?.comments || [];

        const buildTree = () => {
          const nodes = new Map();
          comments.forEach((cm) => {
            const isPostAuthor = postAuthorId != null && cm.user_id === postAuthorId;
            nodes.set(cm.id, {
              id: cm.id,
              authorLabel: isPostAuthor ? '작성자' : `익명 ${cm.anonymous_index}`,
              isWriter: isPostAuthor,
              isMyComment: currentUserId != null && cm.user_id === currentUserId,
              time: formatTimeAgo(cm.created_at),
              content: cm.content,
              likes: cm.like_count,
              replies: [],
            });
          });
          const roots = [];
          comments.forEach((cm) => {
            const node = nodes.get(cm.id);
            if (cm.parent_comment_id) {
              const parent = nodes.get(cm.parent_comment_id);
              if (parent) parent.replies.push(node);
              else roots.push(node);
            } else {
              roots.push(node);
            }
          });
          return roots;
        };
        setAllComments(buildTree());
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments + 1,
              }
            : prev
        );
      }
      setBottomComment('');
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '댓글 작성 중 오류가 발생했습니다.'
      );
    }
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
    const isAuthorLabel = item.authorLabel === '작성자';
    const AuthorLabel = (
      <Text style={isAuthorLabel ? styles.commentAuthorWriter : styles.commentAuthor}>
        {item.authorLabel}
      </Text>
    );

    const bodyHasTag = /@익명\d+/.test(item.content);
    const contentEl = bodyHasTag ? (
      <CommentBody content={item.content} styles={styles} />
    ) : (
      <Text style={styles.commentBody}>{item.content}</Text>
    );

    const isReplyingToThis = replyToCommentId === item.id;

    const commentBlockInner = (
      <>
        <View style={styles.commentRow}>
          <View style={styles.commentAuthorRow}>
            {AuthorLabel}
          </View>
          <Text style={styles.commentTime}>{item.time}</Text>
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
      </>
    );

    const bubble = (
      <View
        style={[
          styles.commentBubble,
          isReply && styles.commentBubbleReply,
          isReplyingToThis && styles.commentBubbleReplying,
        ]}
      >
        <View style={styles.commentReplyBody}>{commentBlockInner}</View>
      </View>
    );

    if (isReply) {
      return (
        <View
          key={item.id}
          style={styles.commentItemReply}
          ref={(r) => {
            if (r) commentWrapperRefs.current[item.id] = r;
          }}
          collapsable={false}
        >
          <View style={styles.commentReplyArrow}>
            <Ionicons name="return-down-forward" size={normalize(16)} color={colors.textSecondary} />
          </View>
          {bubble}
        </View>
      );
    }
    return (
      <View
        key={item.id}
        style={styles.commentItem}
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
      renderComment(c, false, null, () => focusReplyInput(c.id), {
        liked: commentLikedState[c.id],
        onLike: () => handleCommentLike(c.id),
      }),
    ];
    repliesToShow.forEach(({ reply: r, parentAuthorLabel: parentLabel }) => {
      nodes.push(
        renderComment(r, true, parentLabel, () => focusReplyInput(r.id), {
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
    <View style={{ flex: 1, backgroundColor: styles.container.backgroundColor }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Chat과 동일: 헤더 → 컨텐츠 영역(스크롤 + 입력창) */}
        <View style={{ zIndex: 1, elevation: 0, backgroundColor: colors.background }}>
          <SubHeader title="게시판" onBack={handleBack} />
        </View>
        <View style={{ flex: 1, backgroundColor: colors.background, overflow: 'hidden', zIndex: 0 }} pointerEvents="box-none">
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <ScrollView
              ref={scrollViewRef}
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
              {/* 광고 영역 */}
              <View style={styles.adSection}>
                <Text style={styles.adSectionText}>광고</Text>
              </View>

              {/* 댓글: 최상위는 전부 노출, 각 댓글의 대댓글만 3개 제한 후 더보기 */}
              <View style={styles.commentSection}>
                {visibleComments.map((c) => renderCommentTree(c))}
              </View>
            </ScrollView>

            {/* 하단 댓글 입력: Chat과 동일한 래퍼(키보드 높이는 전역 Animated로 올라감) */}
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
              />
            </View>
          </View>
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
                  {(() => {
                    const isPostMenu = floatingMenuContext === 'post';
                    const isCommentMenu = isPostMenu ? null : floatingMenuContext;
                    const commentForMenu =
                      isCommentMenu != null ? findCommentById(allComments, isCommentMenu) : null;
                    const isMyComment = commentForMenu?.isMyComment === true;
                    const isMyPostMenu = isMyPostFromApi;

                    // 메뉴 항목 결정
                    let menuItems;
                    if (isPostMenu && isMyPostMenu) {
                      // 내가 쓴 게시글 - 공유하기, 삭제하기
                      menuItems = [
                        { label: '공유하기', iconName: 'share-outline', onPress: handleSharePost },
                        { label: '삭제하기', iconName: 'trash-outline', onPress: handleDeletePost },
                      ];
                    } else if (isPostMenu) {
                      // 다른 사람 게시글 - 쪽지/공유/신고
                      menuItems = postMenuItemsOthers;
                    } else if (isMyComment) {
                      // 내가 쓴 댓글 - 삭제하기만
                      menuItems = [
                        {
                          label: '삭제하기',
                          iconName: 'trash-outline',
                          onPress: () => handleDeleteComment(isCommentMenu),
                        },
                      ];
                    } else if (commentForMenu) {
                      // 다른 사람 댓글 - 쪽지/신고
                      menuItems = [
                        {
                          label: '쪽지 보내기',
                          iconName: 'chatbubble-outline',
                          onPress: () => {
                            if (commentForMenu.userId && currentUserId && commentForMenu.userId === currentUserId) {
                              Alert.alert('안내', '자기 자신에게는 쪽지를 보낼 수 없습니다.');
                              return;
                            }
                            startNoteToUser(commentForMenu.userId, 'comment');
                          },
                        },
                        {
                          label: '신고하기',
                          iconName: 'flag-outline',
                          onPress: () => {
                            // TODO: 댓글 신고 기능 연결
                          },
                        },
                      ];
                    } else {
                      menuItems = commentMenuItemsOthers;
                    }

                    return menuItems.map((item, index) => (
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
                      {index < menuItems.length - 1 && (
                        <View
                          style={{
                            height: 1,
                            backgroundColor: colors.textLight10,
                            marginHorizontal: normalize(8),
                          }}
                        />
                      )}
                    </React.Fragment>
                  ));
                  })()}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
} 