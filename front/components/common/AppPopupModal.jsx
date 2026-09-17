import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, View } from 'react-native';
import { colors } from '../../styles/colors';

/** 등장·퇴장 페이드 (시간표·타이머 「저장 완료」와 동일 톤) */
const FADE_MS = 220;

/**
 * 앱 공통 중앙 확인 팝업 셸.
 * - 항상 페이드 인/아웃 (개별 animationType 오버라이드 없음)
 * - visible=false 시 내용은 유지한 채 페이드 아웃 후 언마운트
 *
 * 새 확인/안내 팝업은 이 컴포넌트를 쓰세요 (AlertHost / appAlert 포함).
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
  const [mounted, setMounted] = useState(Boolean(visible));
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const animRef = useRef(null);
  const dismissedRef = useRef(false);

  const finishDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (visible) {
      dismissedRef.current = false;
      setMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!mounted) return undefined;

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
      easing: visible
        ? Easing.out(Easing.cubic)
        : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !visible) finishDismiss();
    });

    return () => {
      anim.stop();
      if (animRef.current === anim) animRef.current = null;
    };
  }, [visible, mounted, opacity, finishDismiss]);

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissOnBackPress ? onClose : () => {}}
      onDismiss={() => {
        if (!visible) finishDismiss();
      }}
    >
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: overlayColor,
          justifyContent: 'center',
          alignItems: 'center',
          opacity,
        }}
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={dismissOnBackdrop ? onClose : undefined}
        />
        <View
          style={[
            useDefaultContainerWidth ? { width: '86%', maxWidth: 420 } : null,
            containerStyle,
          ]}
        >
          <View
            style={[
              {
                backgroundColor: colors.background,
                borderRadius: 18,
                paddingHorizontal: 18,
                paddingVertical: 25,
                ...(useDefaultContainerWidth
                  ? { alignSelf: 'stretch', width: '100%' }
                  : { alignSelf: 'center' }),
              },
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
