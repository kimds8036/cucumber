import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../constants/colors';

interface PostDetailHeaderProps {
  author: string;
  createdAt: string;
}

export const PostDetailHeader: React.FC<PostDetailHeaderProps> = ({
  author,
  createdAt,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.author}>{author}</Text>
        <Text style={styles.date}>{createdAt}</Text>
      </View>
      <View style={styles.menuIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  author: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  menuIcon: {
    width: 4,
    height: 16,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
});