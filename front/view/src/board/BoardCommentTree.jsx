import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '../../../styles/colors';

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
        </Text>,
      );
    }
    parts.push(
      <Text
        key={`tag-${m.index}`}
        style={[styles.commentBody, styles.commentTag]}
      >
        @{m[1]}
      </Text>,
    );
    last = regex.lastIndex;
  }
  if (last < content.length) {
    parts.push(
      <Text key={`t-${last}`} style={styles.commentBody}>
        {content.slice(last)}
      </Text>,
    );
  }
  if (parts.length === 0) {
    return <Text style={styles.commentBody}>{content}</Text>;
  }
  return <Text style={styles.commentBody}>{parts}</Text>;
}

export default function BoardCommentTree({
  flatComments,
  commentLikedState,
  replyToCommentId,
  onFocusReply,
  onCommentLike,
  onToggleReplies,
  onOpenMenu,
  commentMenuRefs,
  styles,
  normalize,
}) {
  const horizontalPadding = styles?.commentSection?.paddingHorizontal ?? 0;

  const renderComment = useMemo(
    () =>
      (item, isReply = false, parentAuthorLabel = null) => {
        const isCommentLiked =
          commentLikedState[item.id] !== undefined
            ? commentLikedState[item.id]
            : Boolean(item.liked);
        const isAuthorLabel = item.authorLabel === '작성자';
        const bodyHasTag = /@익명\d+/.test(item.content);
        const contentEl = bodyHasTag ? (
          <CommentBody content={item.content} styles={styles} />
        ) : (
          <Text style={styles.commentBody}>{item.content}</Text>
        );
        const isReplyingToThis = replyToCommentId === item.id;
        const commentBlock = (
          <View style={styles.commentBlock}>
            <View
              style={[styles.detailAuthorRow, { marginBottom: normalize(6) }]}
            >
              <Text
                style={
                  isAuthorLabel
                    ? styles.detailAuthor
                    : styles.detailAuthorAnonymous
                }
                numberOfLines={1}
              >
                {item.authorLabel}
              </Text>
              <Text style={styles.detailDot}>•</Text>
              <Text style={styles.detailTime} numberOfLines={1}>
                {item.time}
              </Text>
              {item.isPinned ? (
                <MaterialCommunityIcons
                  name="pin"
                  size={normalize(12)}
                  color={colors.textSecondary}
                  style={{ marginLeft: normalize(4)}}
                />
              ) : null}
            </View>
            {parentAuthorLabel ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: normalize(2),
                }}
              >
                <Text style={styles.commentReplyLabel}>
                  @{parentAuthorLabel}{' '}
                </Text>
                {contentEl}
              </View>
            ) : (
              contentEl
            )}
            <View style={styles.commentFooter}>
              <View style={styles.commentFooterLeft}>
                <TouchableOpacity
                  style={styles.commentLikeRow}
                  onPress={() => onCommentLike(item.id)}
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
                  onPress={() => onFocusReply(item.id)}
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
                  onPress={() =>
                    onOpenMenu(item.id, commentMenuRefs.current[item.id])
                  }
                >
                  <Entypo
                    name="dots-three-vertical"
                    size={normalize(14)}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

        const bubble = (
          <View
            style={[
              styles.commentBubble,
              isReply && styles.commentBubbleReply,
              isReplyingToThis && styles.commentBubbleReplying,
            ]}
          >
            {commentBlock}
          </View>
        );

        if (isReply) {
          return (
            <View
              key={item.id}
              style={styles.commentItemReply}
              collapsable={false}
            >
              <View style={styles.commentReplyArrow}>
                <Ionicons
                  name="return-down-forward"
                  size={normalize(16)}
                  color={colors.textSecondary}
                />
              </View>
              {bubble}
            </View>
          );
        }

        return (
          <View key={item.id} style={styles.commentItem} collapsable={false}>
            {bubble}
          </View>
        );
      },
    [
      commentLikedState,
      commentMenuRefs,
      normalize,
      onCommentLike,
      onFocusReply,
      onOpenMenu,
      replyToCommentId,
      styles,
    ],
  );

  const renderItem = ({ item }) => {
    if (item.type === 'comment') {
      return (
        <View style={{ paddingHorizontal: horizontalPadding }}>
          {renderComment(item.data, false, null)}
        </View>
      );
    }
    if (item.type === 'reply') {
      return (
        <View style={{ paddingHorizontal: horizontalPadding }}>
          {renderComment(item.data, true, item.parentAuthorLabel)}
        </View>
      );
    }
    if (item.type === 'more') {
      return (
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <TouchableOpacity
            style={styles.loadMoreRowReply}
            onPress={() => onToggleReplies(item.commentId)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-down"
              size={normalize(18)}
              color={colors.textSecondary}
            />
            <Text style={styles.loadMoreText}>댓글 더보기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (item.type === 'collapse') {
      return (
        <View style={{ paddingHorizontal: horizontalPadding }}>
          <TouchableOpacity
            style={styles.loadMoreRowReply}
            onPress={() => onToggleReplies(item.commentId)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-up"
              size={normalize(18)}
              color={colors.textSecondary}
            />
            <Text style={styles.loadMoreText}>댓글 접기</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const keyExtractor = (item, index) => {
    if (item.type === 'comment') return `comment-${item.data.id}`;
    if (item.type === 'reply') return `reply-${item.data.id}`;
    if (item.type === 'more') return `more-${item.commentId}`;
    if (item.type === 'collapse') return `collapse-${item.commentId}`;
    return `item-${index}`;
  };

  return { keyExtractor, renderItem };
}
