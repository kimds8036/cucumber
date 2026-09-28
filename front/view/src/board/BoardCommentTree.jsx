import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '../../../styles/colors';
import EquippedBadge from '../../../components/EquippedBadge';

function countReplies(comment) {
  const replies = comment?.replies;
  if (!replies?.length) return 0;
  return replies.reduce((sum, reply) => sum + 1 + countReplies(reply), 0);
}

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
  const showGroupDivider = (index) => {
    const next = flatComments[index + 1];
    if (next && next.type !== 'comment') return false;
    for (let i = index + 1; i < flatComments.length; i += 1) {
      if (flatComments[i]?.type === 'comment') return true;
    }
    return false;
  };

  const renderComment = useMemo(
    () =>
      (item, isReply = false, parentAuthorLabel = null, showDivider = false) => {
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
        const replyCount = countReplies(item);
        const commentBlock = (
          <View style={styles.commentBlock}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: normalize(4),
              }}
            >
              {isReply ? (
                <View style={styles.commentReplyArrow}>
                  <Ionicons
                    name="return-down-forward"
                    size={normalize(16)}
                    color={colors.textLight4}
                  />
                </View>
              ) : null}
              <View
                style={[styles.detailAuthorRow, { flex: 1, minWidth: 0 }]}
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
                <EquippedBadge
                    badge={item.equippedBadge}
                    size={normalize(13)}
                    style={{ marginLeft: normalize(3), flexShrink: 0, alignSelf: 'center' }}
                  />
                <Text
                  style={[styles.detailTime, { marginLeft: normalize(6) }]}
                  numberOfLines={1}
                >
                  {item.time}
                </Text>
                {item.isPinned ? (
                  <MaterialCommunityIcons
                    name="pin"
                    size={normalize(12)}
                    color={colors.textLight4}
                    style={{ marginLeft: normalize(4), top: normalize(-4)}}
                  />
                ) : null}
              </View>
              <View
                style={[
                  styles.commentFooterLeft,
                  { flex: 0, marginLeft: normalize(8) },
                ]}
              >
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
                  style={styles.commentLikeRow}
                  onPress={() => onFocusReply(item.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={normalize(15)}
                    color={colors.primary}
                  />
                  <Text style={styles.detailStatText}>{replyCount}</Text>
                </TouchableOpacity>
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
                      color={colors.textLight4}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            {parentAuthorLabel ? (
              <View
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: normalize(2),
                    marginLeft: isReply ? normalize(16) + normalize(6) : 0,
                  },
                ]}
              >
                <Text style={styles.commentReplyLabel}>
                  @{parentAuthorLabel}{' '}
                </Text>
                {contentEl}
              </View>
            ) : (
              <View
                style={
                  isReply ? { marginLeft: normalize(16) + normalize(6) } : null
                }
              >
                {contentEl}
              </View>
            )}
          </View>
        );

        const rowStyle = [
          styles.commentRow,
          item.isPinned && styles.commentPinned,
          isReplyingToThis && styles.commentBubbleReplying,
          showDivider && styles.commentRowDivider,
        ];

        return (
          <View key={item.id} style={styles.commentGutter} collapsable={false}>
            <View style={rowStyle}>
              <View style={styles.commentBubble}>{commentBlock}</View>
            </View>
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

  const renderItem = ({ item, index }) => {
    const showDivider = showGroupDivider(index);
    if (item.type === 'comment') {
      return renderComment(item.data, false, null, showDivider);
    }
    if (item.type === 'reply') {
      return renderComment(item.data, true, item.parentAuthorLabel, showDivider);
    }
    if (item.type === 'more' || item.type === 'collapse') {
      const expanded = item.type === 'collapse';
      return (
        <View style={styles.commentSection}>
          <View style={showDivider ? styles.commentRowDivider : null}>
            <TouchableOpacity
              style={styles.loadMoreRowReply}
              onPress={() => onToggleReplies(item.commentId)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={normalize(14)}
                color={colors.textLight4}
              />
              <Text style={styles.loadMoreText}>
                {expanded ? '댓글 접기' : '댓글 더보기'}
              </Text>
            </TouchableOpacity>
          </View>
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
