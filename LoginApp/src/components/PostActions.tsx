import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface PostActionsProps {
  likes: number;
  comments: number;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSavePress?: () => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  likes,
  comments,
  onLikePress,
  onCommentPress,
  onSavePress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.actionButton} onPress={onLikePress}>
        <View style={styles.icon} />
        <Text style={styles.actionText}>좋아요</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
        <View style={styles.icon} />
        <Text style={styles.actionText}>댓글</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={onSavePress}>
        <View style={styles.icon} />
        <Text style={styles.actionText}>저장</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBackground,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
  },
});