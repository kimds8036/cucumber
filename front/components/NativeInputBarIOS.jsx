import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { NativeInputBarView } from 'youth-paper-tab-bar';
import { colors } from '../styles/colors';

export const USES_NATIVE_INPUT_BAR = Platform.OS === 'ios' && !!NativeInputBarView;

/** 네이티브가 유리를 그리는 iOS 26 이상. 그 아래는 네이티브가 흰 바탕을 직접 그린다. */
const USES_GLASS =
  USES_NATIVE_INPUT_BAR && parseInt(String(Platform.Version), 10) >= 26;

/** 네이티브 입력칸은 목록 위에 띄워 콘텐츠가 뒤로 지나가게 한다. */
export const INPUT_BAR_OVERLAY_STYLE = USES_NATIVE_INPUT_BAR
  ? { position: 'absolute', left: 0, right: 0, bottom: 0 }
  : null;

/** 입력칸을 감싸는 뷰 바탕. 유리면 투명, 아니면 지금처럼 흰색. */
export const INPUT_BAR_WRAPPER_BACKGROUND = USES_GLASS
  ? 'transparent'
  : colors.white;

/**
 * 띄운 입력칸 높이. 목록은 이만큼 아래 여백을 둬야 마지막 항목이 가려지지 않는다.
 * JS 입력칸은 목록 아래 자리를 차지하므로 0이다.
 */
export function useInputBarOverlay() {
  const [overlayHeight, setOverlayHeight] = useState(0);
  const onOverlayLayout = useCallback((e) => {
    setOverlayHeight(e.nativeEvent.layout.height);
  }, []);
  return USES_NATIVE_INPUT_BAR
    ? { overlayHeight, onOverlayLayout }
    : { overlayHeight: 0, onOverlayLayout: undefined };
}

// 첫 높이 이벤트가 오기 전 한 줄 입력줄 높이 (캡슐 44 + 위아래 8).
const INITIAL_HEIGHT = 60;

const NativeInputBarIOS = forwardRef(function NativeInputBarIOS(
  {
    value,
    onChangeText,
    onSend,
    placeholder,
    maxLength = 1000,
    editable = true,
    fontSize = 14,
    showAttach = false,
    onPressAttach,
    images = [],
    onRemoveImage,
    reply = null,
    replyStyle,
    onCancelReply,
  },
  ref,
) {
  const nativeRef = useRef(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  // 네이티브가 보낸 변경 횟수를 text와 함께 돌려줘야 늦게 온 옛 글이 입력 중인 글을 덮어쓰지 않는다.
  const [eventCount, setEventCount] = useState(0);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => nativeRef.current?.focus(),
      blur: () => nativeRef.current?.blur(),
      clear: () => nativeRef.current?.clear(),
    }),
    [],
  );

  return (
    <NativeInputBarView
      ref={nativeRef}
      style={{ height }}
      text={value}
      mostRecentEventCount={eventCount}
      placeholder={placeholder}
      maxLength={maxLength}
      editable={editable}
      fontSize={fontSize}
      showAttach={showAttach}
      images={images}
      reply={reply}
      replyStyle={replyStyle}
      textColor={colors.text}
      placeholderColor={colors.textLight4}
      inputBackgroundColor={colors.textLight05}
      barBackgroundColor={colors.white}
      barBorderColor={colors.textLight1}
      sendButtonColor={colors.primary}
      sendIconColor={colors.white}
      attachIconColor={colors.textLight4}
      onChangeText={({ nativeEvent }) => {
        setEventCount(nativeEvent.eventCount);
        onChangeText?.(nativeEvent.text);
      }}
      onSend={() => onSend?.()}
      onPressAttach={() => onPressAttach?.()}
      onRemoveImage={({ nativeEvent }) => onRemoveImage?.(nativeEvent.index)}
      onCancelReply={() => onCancelReply?.()}
      onHeightChange={({ nativeEvent }) => setHeight(nativeEvent.height)}
    />
  );
});

export default NativeInputBarIOS;
