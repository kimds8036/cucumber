import React, { useEffect, useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { api } from '../../../../utils/api';
import { colors, fonts } from '../../../../styles/colors';

const postCache = {};

export default function PostCard({ roomId, normalize, onPress }) {
  const [post, setPost] = useState(null);
  const n = typeof normalize === 'function' ? normalize : (v) => v;

  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

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
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  if (!post) return null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
