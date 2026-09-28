import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../styles/colors';

/** 등장·퇴장 페이드 (시간표·타이머 「저장 완료」와 동일 톤) */
const FADE_MS = 220;

/**
 * 앱 공통 중앙 확인 팝업 셸.
 * - 항상 페이드 인/아웃 (개별 animationType 오버라이드 없음)
 * - visible=false 시 내용은 유지한 채 페이드 아웃 후 숨김
 * - Modal 인스턴스는 유지해서 안드로이드에서 창이 튀지 않게 함
 */
export default function AppPopupModal({
  visible,
  onClose,
  children,
  /** @deprecated 무시됨 — 항상 페이드 */
  animationType: _animationType,
  dismissOnBackdrop = false,
  dismissOnBackPress = true,
  cardStyle,
  containerStyle,
  overlayColor = 'rgba(0,0,0,0.3)',
  useDefaultContainerWidth = true,
  onDismissed,
}) {
  const [shown, setShown] = useState(Boolean(visible));
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const animRef = useRef(null);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const openedRef = useRef(Boolean(visible));

  if (visible && !shown) {
    opacity.setValue(0);
    setShown(true);
  }

  useEffect(() => {
    if (visible) {
      openedRef.current = true;
    } else if (!openedRef.current) {
      return undefined;
    }

    if (animRef.current) {
      animRef.current.stop();
      animRef.current = null;
    }

    if (visible) {
      opacity.setValue(0);
    }

    const anim = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: FADE_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (!finished || visibleRef.current) return;
      setShown(false);
      onDismissedRef.current?.();
    });

    return () => {
      anim.stop();
      if (animRef.current === anim) animRef.current = null;
    };
  }, [visible, opacity]);

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissOnBackPress ? onClose : () => {}}
    >
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.overlay,
          {
            backgroundColor: overlayColor,
            opacity,
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />
        <View
          style={[
            useDefaultContainerWidth ? styles.container : null,
            containerStyle,
          ]}
        >
          <View
            style={[
              styles.card,
              useDefaultContainerWidth ? styles.cardStretch : styles.cardCenter,
              cardStyle,
            ]}
          >
            {children}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '86%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 25,
  },
  cardStretch: {
    alignSelf: 'stretch',
    width: '100%',
  },
  cardCenter: {
    alignSelf: 'center',
  },
});
