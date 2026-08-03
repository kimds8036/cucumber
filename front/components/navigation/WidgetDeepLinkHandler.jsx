import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import {
  consumePendingWidgetDeepLinkTab,
  handleWidgetDeepLinkUrl,
  navigateToMainTab,
  parseWidgetDeepLinkTab,
  stashWidgetDeepLinkTab,
} from '../../navigation/widgetDeepLink';

/**
 * MainStack 마운트 후 위젯 딥링크(school/mypage)를 탭 전환으로 적용.
 * Linking config만으로는 Main 탭 지연 마운트 시 state가 덮어써질 수 있어 폴백.
 */
export default function WidgetDeepLinkHandler() {
  const appliedInitialRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const applyTab = (tab) => {
      if (!tab || cancelled) return;
      // 탭 네비게이터가 180ms 지연일 수 있어 약간 뒤에도 한 번 더
      navigateToMainTab(tab);
      setTimeout(() => {
        if (!cancelled) navigateToMainTab(tab);
      }, 250);
    };

    const onUrl = (url) => {
      const tab = parseWidgetDeepLinkTab(url);
      if (!tab) return;
      applyTab(tab);
    };

    (async () => {
      const pending = consumePendingWidgetDeepLinkTab();
      if (pending) applyTab(pending);

      if (!appliedInitialRef.current) {
        appliedInitialRef.current = true;
        try {
          const initial = await Linking.getInitialURL();
          if (!cancelled && initial) onUrl(initial);
        } catch {
          // ignore
        }
      }
    })();

    const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));
    const appSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const pending = consumePendingWidgetDeepLinkTab();
      if (pending) applyTab(pending);
    });

    return () => {
      cancelled = true;
      sub.remove();
      appSub.remove();
    };
  }, []);

  return null;
}

/** 로그인 전·게이트 중에도 URL을 받아 pending에 쌓음 */
export function stashWidgetDeepLinkFromUrl(url) {
  const tab = parseWidgetDeepLinkTab(url);
  if (tab) stashWidgetDeepLinkTab(tab);
  return handleWidgetDeepLinkUrl(url, { deferIfNotReady: true });
}
