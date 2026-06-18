import React, { useEffect, useRef } from 'react';
import { Animated, Platform, UIManager, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../styles/colors';

function isLottieNativeAvailable() {
  if (Platform.OS === 'web') return false;
  try {
    return (
      UIManager.getViewManagerConfig?.('LottieAnimationView') != null ||
      UIManager.getViewManagerConfig?.('RCTLottieAnimationView') != null
    );
  } catch {
    return false;
  }
}

const HAS_LOTTIE_NATIVE = isLottieNativeAvailable();

function MailboxFallback({ style, normalize }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  const size = style?.width ?? normalize?.(200) ?? 200;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: size / 2,
            backgroundColor: colors.primaryLight20,
          },
          style,
        ]}
      >
        <Ionicons name="mail" size={size * 0.42} color={colors.primaryDark} />
      </View>
    </Animated.View>
  );
}

export default function MailboxLottieAnimation({ style, normalize }) {
  if (!HAS_LOTTIE_NATIVE) {
    return <MailboxFallback style={style} normalize={normalize} />;
  }

  return (
    <LottieView
      source={require('../../../../assets/lottie/mailbox.json')}
      autoPlay
      loop
      speed={0.55}
      style={style}
    />
  );
}
