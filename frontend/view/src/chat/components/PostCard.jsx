import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api } from '../../../../utils/api';
import { colors, fonts } from '../../../../styles/colors';

const postCache = {};

/** 실제 카드와 비슷한 바깥 여백 + 고정 높이(레이아웃 점프 완화) */
function PostCardSkeleton({ n, onLayout }) {
  const bar = (w, h, mt = 0) => (
    <View
      style={{
        width: w,
        height: h,
        marginTop: mt,
        borderRadius: n(4),
        backgroundColor: colors.textLight10,
      }}
    />
  );

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={{
        backgroundColor: colors.background,
        marginHorizontal: n(12),
        marginTop: n(6),
        marginBottom: n(4),
        borderRadius: n(10),
        paddingHorizontal: n(12),
        paddingVertical: n(8),
        height: n(100),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        justifyContent: 'space-between',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: n(8),
        }}
      >
        <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
          {bar('72%', n(10))}
          {bar('48%', n(8), n(8))}
        </View>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            backgroundColor: colors.textLight10,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      </View>
      {bar('100%', n(12), n(6))}
    </View>
  );
}

export default function PostCard({
  roomId,
  normalize,
  onPress,
  onReady,
  onThumbnailLoaded,
  onLoadingChange,
}) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(roomId));
  const n = typeof normalize === 'function' ? normalize : (v) => v;
  const readyFiredRef = useRef(false);
  const thumbLoadFiredRef = useRef(false);
  const loadingRef = useRef(loading);

  useEffect(() => {
    readyFiredRef.current = false;
    thumbLoadFiredRef.current = false;
  }, [roomId]);

  useEffect(() => {
    if (loadingRef.current && !loading && post) {
      readyFiredRef.current = false;
      thumbLoadFiredRef.current = false;
    }
    loadingRef.current = loading;
  }, [loading, post]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  const handleLayout = useCallback(() => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onReady?.();
  }, [onReady]);

  const handleThumbnailLoad = useCallback(() => {
    if (thumbLoadFiredRef.current) return;
    thumbLoadFiredRef.current = true;
    onThumbnailLoaded?.();
  }, [onThumbnailLoaded]);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setPost(null);
      return;
    }
    let isMounted = true;
    setLoading(true);
    setPost(null);

    (async () => {
      try {
        const res = await api.get(`/api/messages/rooms/${roomId}?limit=1`);
        const room = res.data?.room;
        if (!room || !isMounted) return;

        const postId = room.post_id;
        let data = {
          id: postId,
          author: '익명',
          time: '',
          location: '',
          content: room.post_content || '',
          likes: 0,
          comments: 0,
          isLiked: false,
          thumbnail:
            typeof room.post_thumbnail === 'string' &&
            room.post_thumbnail.trim()
              ? room.post_thumbnail.trim()
              : '',
        };

        if (postId && postCache[postId]) {
          data = { ...data, ...postCache[postId] };
        } else if (postId) {
          try {
            const postRes = await api.get(`/api/posts/${postId}`);
            const pd = postRes.data?.data;
            if (pd) {
              const cached = {
                likes: pd.like_count,
                comments: pd.comment_count,
                isLiked: Boolean(pd.isLiked),
                thumbnail: pd.thumbnail ?? '',
              };
              postCache[postId] = cached;
              data = { ...data, ...cached };
            }
          } catch {
            /* ignore */
          }
        }

        if (isMounted) setPost(data);
      } catch {
        /* ignore */
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  if (loading) {
    return <PostCardSkeleton n={n} onLayout={handleLayout} />;
  }

  if (!post) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLayout={handleLayout}
      onPress={() => onPress?.(post)}
      style={{
        backgroundColor: colors.background,
        marginHorizontal: n(12),
        marginTop: n(6),
        marginBottom: n(4),
        borderRadius: n(10),
        paddingHorizontal: n(12),
        paddingVertical: n(8),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: n(8),
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: n(8),
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: n(11),
                fontFamily: fonts.regular,
                color: colors.textSecondary,
              }}
            >
              {post.author}
              {post.location ? ` · ${post.location}` : ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome
                name={post.isLiked ? 'heart' : 'heart-o'}
                size={n(12)}
                color={colors.alert}
                style={{ marginRight: n(3) }}
              />
              <Text
                style={{
                  fontSize: n(11),
                  fontFamily: fonts.regular,
                  color: colors.textSecondary,
                  marginRight: n(10),
                }}
              >
                {post.likes}
              </Text>
              <Ionicons
                name="chatbubble-outline"
                size={n(13)}
                color={colors.primary}
                style={{ marginRight: n(3) }}
              />
              <Text
                style={{
                  fontSize: n(11),
                  fontFamily: fonts.regular,
                  color: colors.textSecondary,
                }}
              >
                {post.comments}
              </Text>
            </View>
          </View>
        </View>
        {typeof post.thumbnail === 'string' && post.thumbnail.trim() ? (
          <Image
            source={{ uri: post.thumbnail.trim() }}
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              backgroundColor: colors.textLight10,
            }}
            resizeMode="cover"
            onLoad={handleThumbnailLoad}
            onError={handleThumbnailLoad}
          />
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          marginTop: n(5),
          fontSize: n(13),
          fontFamily: fonts.regular,
          color: colors.textPrimary,
          lineHeight: n(18),
        }}
      >
        {post.content}
      </Text>
    </TouchableOpacity>
  );
}
