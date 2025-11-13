import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';
import { Comment } from '../types';

interface CommentCardProps {
  comment: Comment;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.author}>{comment.author}</Text>
          <TouchableOpacity>
            <View style={styles.menuIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.text}>{comment.content}</Text>
        <Text style={styles.date}>{comment.createdAt}</Text>
      </View>
      <TouchableOpacity style={styles.replyButton}>
        <View style={styles.replyIcon} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBackground,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  author: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  menuIcon: {
    width: 4,
    height: 16,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
  text: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  replyButton: {
    padding: 4,
  },
  replyIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
});