import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface PostDetailContentProps {
  title: string;
  content: string;
}

export const PostDetailContent: React.FC<PostDetailContentProps> = ({
  title,
  content,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.content}>{content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});