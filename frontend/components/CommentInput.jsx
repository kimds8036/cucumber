import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export default function CommentInput({
  bottomInputRef,
  bottomComment,
  setBottomComment,
  replyToCommentId,
  replyToAuthorLabel,
  clearReplyTarget,
  handleSendComment,
  styles,
  normalize,
}) {
  return (
    <View style={styles.bottomInputRow}>
      {replyToCommentId ? (
        <View style={styles.replyTargetRow}>
          <Text style={styles.replyTargetText} numberOfLines={1}>
            {replyToAuthorLabel}에게 답글
          </Text>
          <TouchableOpacity
            onPress={clearReplyTarget}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.replyTargetCancel}
          >
            <Ionicons name="close-circle" size={normalize(18)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.bottomInputInner}>
        <TextInput
          ref={bottomInputRef}
          style={styles.bottomInput}
          placeholder={replyToCommentId ? `${replyToAuthorLabel}에게 답글 입력...` : '댓글을 입력하세요'}
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
    </View>
  );
}
