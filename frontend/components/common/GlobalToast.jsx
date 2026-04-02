import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';

export default function GlobalToast({
  toastId,
  message,
  visible,
  isChat = false,
  onPress,
  onHide,
  topOffset = 55,
}) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible || !message) return;

    translateY.setValue(-80);
    opacity.setValue(0);
    progress.setValue(1);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 0,
          duration: 2400,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onHide?.());
  }, [visible, message, toastId, translateY, opacity, progress, onHide]);

  if (!visible || !message) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: topOffset,
        left: 16,
        right: 16,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={{
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 14,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: '#1a1a1a',
            fontWeight: '600',
          }}
        >
          {message}
        </Text>
        {isChat ? (
          <View
            style={{
              marginTop: 10,
              height: 1,
              borderRadius: 0.5,
              backgroundColor: 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                height: 1,
                borderRadius: 0.5,
                backgroundColor: '#4CAF50',
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }}
            />
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}
