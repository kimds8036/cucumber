import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Share } from 'react-native';
import { api } from '../../../utils/api';
import { normalizeTagsFromApi } from '../../../utils/normalizePostTags';
import { invalidateProfileCountsCache } from '../../../utils/profileCountsCache';
import { equippedBadgeFromApiRow } from '../../../constants/badges';

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

function buildTree(comments, postAuthorId, currentUserId) {
  const nodes = new Map();
  comments.forEach((c) => {
    const isPostAuthor = postAuthorId != null && c.user_id === postAuthorId;
    nodes.set(c.id, {
      id: c.id,
      userId: c.user_id,
      authorLabel: isPostAuthor ? '작성자' : `익명 ${c.anonymous_index}`,
      equippedBadge: isPostAuthor ? equippedBadgeFromApiRow(c) : null,
      isWriter: isPostAuthor,
      isMyComment: currentUserId != null && c.user_id === currentUserId,
      isPinned: Boolean(c.is_pinned),
      parentCommentId: c.parent_comment_id ?? null,
      time: formatTimeAgo(c.created_at),
      content: c.content,
      likes: c.like_count,
      liked: Boolean(c.isLiked),
      replies: [],
    });
  });

  const roots = [];
  comments.forEach((c) => {
    const node = nodes.get(c.id);
    if (c.parent_comment_id) {
      const parent = nodes.get(c.parent_comment_id);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });
  roots.sort((a, b) => {
    const ap = a.isPinned ? 1 : 0;
    const bp = b.isPinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return 0;
  });
  return roots;
}

export function useBoardDetail({
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
  onCloseMenu,
  emitBoardPostLike,
  emitBoardPostScrap,
}) {
  const emptyPostShell = {
    id: null,
    author: '익명',
    time: '',
    location: '',
    content: '',
    likes: 0,
    comments: 0,
    liked: false,
    scraps: 0,
    images: [],
    tags: [],
    distanceKm: null,
  };

  const [post, setPost] = useState(() => {
    const fromParams = routePost != null;
    const base = fromParams
      ? { ...emptyPostShell, ...routePost }
      : emptyPostShell;
    return {
      ...base,
      id: routePostId ?? routePost?.id ?? base.id ?? null,
      author: '익명',
      images: Array.isArray(base.images) ? base.images : [],
      tags: normalizeTagsFromApi(base.tags),
      distanceKm:
        typeof base.distanceKm === 'number' && !Number.isNaN(base.distanceKm)
          ? base.distanceKm
          : null,
    };
  });
  const [allComments, setAllComments] = useState([]);
  const [postLiked, setPostLiked] = useState(Boolean(routePost?.liked));
  const [postScrapped, setPostScrapped] = useState(
    Boolean(routePost?.isScrapped),
  );
  const [commentLikedState, setCommentLikedState] = useState({});
  const [isMyPostFromApi, setIsMyPostFromApi] = useState(
    Boolean(routePost?.isMine),
  );
  const [postAuthorId, setPostAuthorId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [deletedCommentIds, setDeletedCommentIds] = useState([]);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const isSendingCommentRef = useRef(false);
  const refreshHasUnreadRef = useRef(refreshHasUnread);
  const coordsRef = useRef(coords);
  const initialFetchDoneRef = useRef(false);
  coordsRef.current = coords;

  useEffect(() => {
    refreshHasUnreadRef.current = refreshHasUnread;
  }, [refreshHasUnread]);

  const fetchPostAndComments = useCallback(async () => {
    const postId = routePostId ?? routePost?.id;
    if (postId == null || postId === '') return;
    try {
      setIsInitialLoading(true);
      const detailParams = {};
      const c = coordsRef.current;
      if (c) {
        detailParams.viewerLat = c.latitude;
        detailParams.viewerLng = c.longitude;
      }
      const postRes = await api.get(`/api/posts/${postId}`, {
        params: detailParams,
      });
      const data = postRes.data?.data;
      if (data) {
        const imageUrls = Array.isArray(data.images)
          ? data.images.filter((u) => typeof u === 'string')
          : [];
        setPost({
          id: data.id,
          author: '익명',
          equippedBadge: equippedBadgeFromApiRow(data),
          time: formatTimeAgo(data.created_at),
          location: data.location ?? '',
          content: data.content,
          likes: data.like_count,
          comments: data.comment_count,
          scraps: data.scrapCount ?? 0,
          images: imageUrls,
          tags: normalizeTagsFromApi(data.tags),
          distanceKm:
            typeof data.distanceKm === 'number' &&
            !Number.isNaN(data.distanceKm)
              ? data.distanceKm
              : typeof routePost?.distanceKm === 'number' &&
                  !Number.isNaN(routePost.distanceKm)
                ? routePost.distanceKm
                : null,
        });
        setPostLiked(Boolean(data.isLiked));
        setPostScrapped(Boolean(data.isScrapped));
        if (data.isMine !== undefined) setIsMyPostFromApi(data.isMine);
        if (data.post_author_id != null) setPostAuthorId(data.post_author_id);
        if (data.current_user_id != null)
          setCurrentUserId(data.current_user_id);
      }

      const commentRes = await api.get(`/api/${postId}/comments`);
      const comments = commentRes.data?.data?.comments || [];
      const postAuthorIdForTree = postRes.data?.data?.post_author_id ?? null;
      const currentUserIdForTree = postRes.data?.data?.current_user_id ?? null;
      setAllComments(
        buildTree(comments, postAuthorIdForTree, currentUserIdForTree),
      );

      try {
        await api.post('/api/notifications/read-by-related', {
          relatedType: 'post',
          relatedId: postId,
        });
        refreshHasUnreadRef.current?.();
      } catch (e) {
        console.error('게시글 관련 알림 읽음 처리 실패:', e);
      }
    } catch (error) {
      console.error('게시글/댓글 로드 실패:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '게시글을 불러오는 중 오류가 발생했습니다.',
      );
    } finally {
      setIsInitialLoading(false);
    }
  }, [routePostId, routePost?.id, routePost?.distanceKm]);

  const patchPostDistance = useCallback(async () => {
    const postId = routePostId ?? routePost?.id;
    const c = coordsRef.current;
    if (postId == null || postId === '' || !c) return;
    try {
      const postRes = await api.get(`/api/posts/${postId}`, {
        params: { viewerLat: c.latitude, viewerLng: c.longitude },
      });
      const data = postRes.data?.data;
      const d =
        typeof data?.distanceKm === 'number' && !Number.isNaN(data.distanceKm)
          ? data.distanceKm
          : null;
      if (d == null) return;
      setPost((prev) => (prev ? { ...prev, distanceKm: d } : prev));
    } catch (e) {
      console.error('[BoardDetail] 거리 보정 로드 실패:', e);
    }
  }, [routePostId, routePost?.id]);

  useEffect(() => {
    initialFetchDoneRef.current = false;
  }, [routePostId, routePost?.id]);

  useEffect(() => {
    const postId = routePostId ?? routePost?.id;
    if (postId == null || postId === '') return;
    if (initialFetchDoneRef.current) return;

    initialFetchDoneRef.current = true;
    fetchPostAndComments();
  }, [fetchPostAndComments, routePostId, routePost?.id]);

  useEffect(() => {
    if (isInitialLoading || !coords) return;
    patchPostDistance();
  }, [
    isInitialLoading,
    coords?.latitude,
    coords?.longitude,
    patchPostDistance,
  ]);

  const startNoteToUser = useCallback(
    async (targetUserId, source) => {
      if (!targetUserId || !post?.id) {
        console.error('[BoardDetail] 쪽지 전송 불가 - 잘못된 파라미터', {
          targetUserId,
          postId: post?.id,
          source,
        });
        Alert.alert('오류', '쪽지를 보낼 수 없습니다.');
        return;
      }
      try {
        const res = await api.post('/api/messages/rooms', {
          postId: post.id,
          otherUserId: targetUserId,
        });
        const room = res.data?.data;
        if (!room?.id) {
          console.error('[BoardDetail] 쪽지방 데이터 이상', res.data);
          Alert.alert('오류', '쪽지 방 정보를 불러올 수 없습니다.');
          return;
        }
        navigation.navigate('Chat', { roomId: room.id });
      } catch (error) {
        console.error(
          '[BoardDetail] 쪽지방 생성/조회 실패:',
          error?.response?.data || error,
        );
        Alert.alert(
          '오류',
          error.response?.data?.message ||
            '쪽지방을 여는 중 오류가 발생했습니다.',
        );
      }
    },
    [navigation, post?.id],
  );

  const handleSharePost = useCallback(async () => {
    if (!post?.id) return;
    const { message, url, title } = buildPostShareContent(post.id);
    try {
      await Share.share({
        message,
        url,
        title,
      });
    } catch (error) {
      console.error('게시글 공유 실패:', error);
    }
  }, [post?.id]);

  const handleDeletePost = useCallback(() => {
    onCloseMenu?.();
    Alert.alert('게시글 삭제', '이 게시글을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/posts/${post.id}`);
            await invalidateProfileCountsCache();
            Alert.alert('삭제됨', '게시글이 삭제되었습니다.', [
              { text: '확인', onPress: () => navigation.goBack() },
            ]);
          } catch (error) {
            console.error('게시글 삭제 오류:', error);
            Alert.alert(
              '오류',
              error.response?.data?.message ||
                '게시글 삭제 중 오류가 발생했습니다.',
            );
          }
        },
      },
    ]);
  }, [navigation, onCloseMenu, post?.id]);

  const handleDeleteComment = useCallback(
    (commentId) => {
      onCloseMenu?.();
      Alert.alert('댓글 삭제', '이 댓글을 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/comments/${commentId}`);
              setDeletedCommentIds((prev) => [...prev, commentId]);
              setPost((prev) =>
                prev
                  ? { ...prev, comments: Math.max(0, (prev.comments || 0) - 1) }
                  : prev,
              );
              Alert.alert('삭제됨', '댓글이 삭제되었습니다.');
            } catch (error) {
              console.error('댓글 삭제 오류:', error);
              Alert.alert(
                '오류',
                error.response?.data?.message ||
                  '댓글 삭제 중 오류가 발생했습니다.',
              );
            }
          },
        },
      ]);
    },
    [onCloseMenu],
  );

  const handlePinComment = useCallback(
    async (commentId, pin = true) => {
      onCloseMenu?.();
      if (!post?.id || !commentId) return;
      try {
        await api.patch(`/api/${post.id}/comments/${commentId}/pin`, { pin });
        const commentRes = await api.get(`/api/${post.id}/comments`);
        const comments = commentRes.data?.data?.comments || [];
        setAllComments(buildTree(comments, postAuthorId, currentUserId));
      } catch (error) {
        console.error('댓글 고정 오류:', error);
        Alert.alert(
          '오류',
          error.response?.data?.message || '댓글 고정 처리에 실패했습니다.',
        );
      }
    },
    [currentUserId, onCloseMenu, post?.id, postAuthorId],
  );

  const handlePostLike = useCallback(async () => {
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
          : prev,
      );
      emitBoardPostLike?.(
        post.id,
        Boolean(isLiked),
        post.likes + (isLiked ? 1 : -1),
      );
    } catch (error) {
      console.error('게시글 좋아요 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '좋아요 처리 중 오류가 발생했습니다.',
      );
    }
  }, [emitBoardPostLike, post?.id, post?.likes]);

  const handlePostScrap = useCallback(async () => {
    try {
      const res = await api.post(`/api/posts/${post.id}/scrap`);
      const scrapped = res.data?.scrapped;
      await invalidateProfileCountsCache();
      setPostScrapped(Boolean(scrapped));
      setPost((prev) => {
        const cur = prev?.scraps ?? 0;
        const next = scrapped ? cur + 1 : Math.max(0, cur - 1);
        return prev ? { ...prev, scraps: next } : prev;
      });
      const curScrap = post?.scraps ?? 0;
      const nextScrap = scrapped ? curScrap + 1 : Math.max(0, curScrap - 1);
      emitBoardPostScrap?.(post.id, Boolean(scrapped), nextScrap);
    } catch (error) {
      console.error('게시글 스크랩 오류:', error);
      Alert.alert('오류', '스크랩 처리 중 오류가 발생했습니다.');
    }
  }, [emitBoardPostScrap, post?.id, post?.scraps]);

  const handleCommentLike = useCallback(async (commentId) => {
    try {
      const res = await api.post(`/api/${commentId}/like`);
      const isLiked = res.data?.data?.isLiked;
      setCommentLikedState((prev) => ({
        ...prev,
        [commentId]: Boolean(isLiked),
      }));
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
        }),
      );
    } catch (error) {
      console.error('댓글 좋아요 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message ||
          '댓글 좋아요 처리 중 오류가 발생했습니다.',
      );
    }
  }, []);

  const handleSendComment = useCallback(async () => {
    if (isSendingCommentRef.current) return;
    if (!bottomComment.trim() && commentImages.length === 0) return;
    isSendingCommentRef.current = true;
    setIsSendingComment(true);
    try {
      const postId = post?.id;
      const formData = new FormData();
      formData.append('content', bottomComment.trim());
      if (replyToCommentId) {
        formData.append('parentCommentId', String(replyToCommentId));
      }
      commentImages.forEach((uri, index) => {
        formData.append('images', {
          uri,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        });
      });
      const res = await api.post(`/api/${postId}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const c = res.data?.data;
      if (c) {
        const commentRes = await api.get(`/api/${post.id}/comments`);
        const comments = commentRes.data?.data?.comments || [];
        setAllComments(buildTree(comments, postAuthorId, currentUserId));
        setPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments + 1,
              }
            : prev,
        );
      }
      setBottomComment('');
      setCommentImages([]);
      setReplyToCommentId(null);
      setReplyToAuthorLabel('');
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      Alert.alert(
        '오류',
        error.response?.data?.message || '댓글 작성 중 오류가 발생했습니다.',
      );
    } finally {
      isSendingCommentRef.current = false;
      setIsSendingComment(false);
    }
  }, [
    bottomComment,
    commentImages,
    currentUserId,
    post?.id,
    postAuthorId,
    replyToCommentId,
    setBottomComment,
    setCommentImages,
    setReplyToAuthorLabel,
    setReplyToCommentId,
  ]);

  return {
    post,
    setPost,
    allComments,
    setAllComments,
    postLiked,
    setPostLiked,
    postScrapped,
    setPostScrapped,
    commentLikedState,
    setCommentLikedState,
    isMyPostFromApi,
    postAuthorId,
    currentUserId,
    deletedCommentIds,
    setDeletedCommentIds,
    isSendingComment,
    isInitialLoading,
    fetchPostAndComments,
    handleSendComment,
    handlePostLike,
    handlePostScrap,
    handleCommentLike,
    handleDeletePost,
    handleDeleteComment,
    handlePinComment,
    startNoteToUser,
    handleSharePost,
  };
}
