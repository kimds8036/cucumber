import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { colors } from '../../styles/colors';

/** fade 종료 후 언마운트 (iOS 투명 터치 차단 레이어 잔존 방지) */
const DISMISS_MS = 320;

/**
 * 시간표 「저장 완료」 등 공통 중앙 확인 팝업 셸.
 * - fade + statusBarTranslucent
 * - visible=false 시 내용은 유지한 채 페이드 아웃 후 언마운트
 */
export default function AppPopupModal({
  visible,
  onClose,
  children,
  animationType = 'fade',
  dismissOnBackdrop = false,
  dismissOnBackPress = true,
  cardStyle,
  containerStyle,
  overlayColor = 'rgba(0,0,0,0.3)',
  useDefaultContainerWidth = true,
  onDismissed,
}) {
  const [mounted, setMounted] = useState(visible);
  const dismissedRef = useRef(false);
  const timerRef = useRef(null);

  const finishDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setMounted(false);
    onDismissed?.();
  }, [onDismissed]);

  useEffect(() => {
    if (visible) {
      dismissedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    timerRef.current = setTimeout(finishDismiss, DISMISS_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, mounted, finishDismiss]);

  if (!mounted) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismissOnBackPress ? onClose : () => {}}
      onDismiss={() => {
        if (!visible) finishDismiss();
      }}
    >
      <View
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          backgroundColor: overlayColor,
          justifyContent: 'center',
          alignItems: 'center',
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
      </View>
    </Modal>
  );
}
