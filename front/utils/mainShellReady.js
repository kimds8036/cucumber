import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 메인 헤더·푸터 배치가 안정된 뒤에만 스플래시를 내린다. */
let ready = false;
const listeners = new Set();

export function markMainShellReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((listener) => listener());
}

export function subscribeMainShellReady(listener) {
  listeners.add(listener);
  if (ready) listener();
  return () => listeners.delete(listener);
}

/**
 * 상·하단 안전 영역이 같은 값으로 두 프레임 유지되면 스플래시를 내리도록 알린다.
 * 화면을 투명하게 숨기면 iOS 26 유리 탭 바가 배경 없이 그려지므로 스플래시로만 가린다.
 */
export function useStableChrome() {
  const insets = useSafeAreaInsets();
  const insetKey = `${insets.top}:${insets.bottom}`;
  const insetKeyRef = useRef(insetKey);
  insetKeyRef.current = insetKey;
  const readyRef = useRef(false);
  const [chromeReady, setChromeReady] = useState(false);

  const reveal = useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setChromeReady(true);
    markMainShellReady();
  }, []);

  useEffect(() => {
    if (readyRef.current) return undefined;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (insetKeyRef.current !== insetKey) return;
        reveal();
      });
    });
    const cap = setTimeout(reveal, 500);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      clearTimeout(cap);
    };
  }, [insetKey, reveal]);

  return chromeReady;
}
