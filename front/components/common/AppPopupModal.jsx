import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  initialWindowMetrics,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';

/**
 * 모달 창이 뜨는 첫 프레임에 useSafeAreaInsets()가 0이었다가
 * 바로 상태바·내비게이션 값으로 바뀌면, 회색 배경 여백과 카드가 한 번 튀고 제자리로 돌아온다.
 * 앱이 켜질 때 잡힌 값으로 고정한다. (iOS는 이 틀을 쓰지 않음)
 */
const frameInsets = initialWindowMetrics?.insets ?? {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};
const FRAME_PAD_TOP = Math.max(frameInsets.top, 16);
const FRAME_PAD_BOTTOM = Math.max(frameInsets.bottom, 16);

const IS_IOS = Platform.OS === 'ios';

/** 등장·퇴장 페이드 (시간표·타이머 「저장 완료」와 동일 톤) */
const FADE_MS = 220;

/**
 * 앱 공통 중앙 확인 팝업 셸.
 * - 항상 페이드 인/아웃 (개별 animationType 오버라이드 없음)
 * - visible=false 시 내용은 유지한 채 페이드 아웃 후 숨김
 * - Modal 인스턴스는 유지해서 안드로이드에서 창이 튀지 않게 함
 * - 세이프에어리어·키보드를 반영해 카드가 위로 밀리거나 아래가 잘리지 않게 함
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
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
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
      Keyboard.dismiss();
    }
  }, [visible]);

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

  const screen = Dimensions.get('screen');

  const overlay = (
    <Animated.View
      pointerEvents={IS_IOS ? (visible ? 'auto' : 'none') : undefined}
      style={[
        IS_IOS ? styles.overlayIOS : styles.overlay,
        IS_IOS ? { backgroundColor: overlayColor } : null,
        {
          opacity,
          paddingTop: IS_IOS ? Math.max(insets.top, 16) : FRAME_PAD_TOP,
          paddingBottom: IS_IOS ? Math.max(insets.bottom, 16) : FRAME_PAD_BOTTOM,
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
          // Android Modal은 처음에 내용 영역 크기를 0×0으로 시작해서 퍼센트 너비가 내용 폭으로 줄어든다.
          useDefaultContainerWidth && Platform.OS === 'android'
            ? { width: Math.min(windowWidth * 0.86, 420) }
            : null,
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
  );

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
      {IS_IOS ? (
        overlay
      ) : (
        <View
          pointerEvents={visible ? 'auto' : 'none'}
          style={[styles.frame, { width: screen.width, height: screen.height }]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: overlayColor, opacity },
            ]}
          />
          {overlay}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayIOS: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '86%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.white,
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
