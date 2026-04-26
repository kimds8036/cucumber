import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/timer';

export default function GlobalToast({
  toastId,
  message,
  senderName,
  body,
  visible,
  isChat = false,
  showProgress = false,
  onPress,
  onHide,
  topOffset = 60,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const prevVisibleRef = useRef(false);
  const prevToastIdRef = useRef(null);
  const [exiting, setExiting] = useState(false);

  const showBar = Boolean(showProgress || isChat);
  const showStructured = Boolean(senderName || body);
  const singleLineText = showStructured
    ? `${senderName || '새 메시지'}: ${body || ''}`.trim()
    : message;

  useEffect(() => {
    if (!message) return;

    if (visible) {
      if (!prevVisibleRef.current) {
        translateY.setValue(-normalize(80));
        opacity.setValue(0);
        contentOpacity.setValue(1);
        contentTranslateY.setValue(0);
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
        ]).start();
        prevToastIdRef.current = toastId;
      } else if (prevToastIdRef.current !== toastId) {
        contentOpacity.setValue(0.82);
        contentTranslateY.setValue(normalize(5));
        Animated.parallel([
          Animated.spring(contentOpacity, {
            toValue: 1,
            friction: 7,
            tension: 120,
            useNativeDriver: true,
          }),
          Animated.timing(contentTranslateY, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
        prevToastIdRef.current = toastId;
      }
      prevVisibleRef.current = true;
      setExiting(false);
      return;
    }

    if (prevVisibleRef.current) {
      prevVisibleRef.current = false;
      setExiting(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -normalize(80),
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
      ]).start(() => {
        setExiting(false);
        onHide?.();
      });
    }
  }, [visible, message, toastId, translateY, opacity, contentOpacity, contentTranslateY, onHide]);

  /* 로딩바 애니메이션 — 사용 시 아래 progress 블록과 함께 복구
  useEffect(() => {
    if (!visible || !message || !showBar) return;
    progress.setValue(1);
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: 2800,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [visible, message, toastId, showBar, progress]);
  */

  if (!message) return null;
  if (!visible && !exiting) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: normalize(topOffset),
        left: normalize(16),
        right: normalize(16),
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={{
          backgroundColor: colors.background,
          borderRadius: normalize(16),
          paddingHorizontal: normalize(16),
          paddingVertical: normalize(14),
          shadowColor: colors.shadow,
          shadowOpacity: 0.12,
          shadowRadius: normalize(16),
          shadowOffset: { width: 0, height: normalize(4) },
          elevation: 8,
        }}
      >
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: normalize(fontSizes.xl),
              color: colors.textPrimary,
              fontFamily: fonts.bold,
            }}
          >
            {singleLineText}
          </Text>
        </Animated.View>
        {/* 로딩바 — 사용 시 위쪽 progress useEffect와 함께 복구
        {showBar ? (
          <View
            style={{
              marginTop: 10,
              height: 2,
              borderRadius: 1,
              backgroundColor: 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={{
                height: 2,
                borderRadius: 1,
                backgroundColor: '#4CAF50',
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              }}
            />
          </View>
        ) : null}
        */}
      </TouchableOpacity>
    </Animated.View>
  );
}
