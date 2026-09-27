import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, fontSizes } from '../../../styles/colors';
import SignupPrimaryFooter from './SignupPrimaryFooter';

/**
 * 가입 직후 환영 화면. 확인을 누르면 기존 login() 라우트로 들어간다.
 */
const AuthSignupComplete = ({
  onConfirm,
  submitting = false,
  title = '가입이 완료되었습니다!',
  subtitles = ['지금 바로 서비스를 이용할 수 있어요'],
}) => {
  const { width } = useWindowDimensions();
  const normalize = (size) => Math.round((width / 375) * size);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { opacity }]}>
        <View style={styles.check}>
          <Feather name="check" size={normalize(28)} color={colors.textWhite} />
        </View>
        <Text style={styles.hello}>환영합니다</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitles.map((line) => (
          <Text key={line} style={styles.sub}>
            {line}
          </Text>
        ))}
      </Animated.View>
      <SignupPrimaryFooter
        label="시작하기"
        onPress={() => onConfirm?.()}
        disabled={submitting}
        loading={submitting}
        cancelParentPadding
      />
    </View>
  );
};

function createStyles(normalize) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: normalize(24),
    },
    check: {
      width: normalize(56),
      height: normalize(56),
      borderRadius: normalize(28),
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(16),
    },
    hello: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.heading),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(6),
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(8),
    },
    sub: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.lg),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
    },
  });
}

export default AuthSignupComplete;
