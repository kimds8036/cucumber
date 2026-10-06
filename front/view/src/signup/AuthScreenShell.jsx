import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

/**
 * 로그인·가입 진입용 흰 배경. 헤더 바는 넣지 않는다.
 * 초록은 CTA·로고·포커스에만 쓴다.
 */
const AuthScreenShell = ({ children, edges = ['top', 'bottom'], style }) => {
  return (
    <View style={[styles.root, style]}>
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
});

export default AuthScreenShell;
