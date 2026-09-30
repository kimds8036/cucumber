import { StyleSheet } from 'react-native';
import { colors, fonts } from './colors';
export const getNormalize = (width) => {
  const scale = width / 375;
  return (size) => Math.round(scale * size);
};

/** 학교 게시판·우편함 목록 화면 전용. 카드 모양은 createBoardStyles (board.style.js) */
export const createSchoolBoardStyles = (width, normalize) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    cardGutter: {
      paddingHorizontal: width * 0.04,
    },
    emptyContainer: {
      paddingVertical: normalize(40),
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: fonts.regular,
      color: colors.textLight4,
    },
    loadingMoreContainer: {
      paddingVertical: normalize(16),
      alignItems: 'center',
    },
    listContentContainer: {
      paddingBottom: normalize(80),
    },
  });
