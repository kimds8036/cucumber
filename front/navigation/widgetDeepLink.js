import * as Linking from 'expo-linking';
import { navigationRef } from './navigationRef';

const MAIN_TABS = new Set(['board', 'message', 'school', 'timer', 'mypage']);

/** hydrate/게이트 전에 들어온 위젯 URL 보관 */
let pendingWidgetTab = null;

/**
 * youthpaper://school | youthpaper://mypage | …/school 형태 파싱
 * @param {string|null|undefined} url
 * @returns {'school'|'mypage'|null}
 */
export function parseWidgetDeepLinkTab(url) {
  if (!url || typeof url !== 'string') return null;
  const raw = url.trim();
  if (!raw) return null;

  let host = '';
  let path = '';
  try {
    const parsed = Linking.parse(raw);
    host = String(parsed?.hostname || '').replace(/^\//, '');
    path = String(parsed?.path || '')
      .replace(/^\//, '')
      .split('/')[0];
  } catch {
    // fallback below
  }

  const candidate = (path || host || '').toLowerCase();
  if (candidate === 'school' || candidate === 'mypage') return candidate;

  // Linking.parse 실패·모호한 경우 host-style youthpaper://school
  const m = raw.match(/^[a-z][a-z0-9+.-]*:\/\/\/?([^/?#]+)/i);
  if (m) {
    const part = String(m[1] || '')
      .trim()
      .toLowerCase();
    if (part === 'school' || part === 'mypage') return part;
  }
  return null;
}

export function stashWidgetDeepLinkTab(tab) {
  if (MAIN_TABS.has(tab)) pendingWidgetTab = tab;
}

export function consumePendingWidgetDeepLinkTab() {
  const tab = pendingWidgetTab;
  pendingWidgetTab = null;
  return tab;
}

export function peekPendingWidgetDeepLinkTab() {
  return pendingWidgetTab;
}

/**
 * Main 탭으로 이동. 네비 미준비면 짧게 재시도.
 * @param {'school'|'mypage'|string} tab
 */
export function navigateToMainTab(tab) {
  if (!MAIN_TABS.has(tab)) return false;

  const tryNav = () => {
    if (!navigationRef.isReady()) return false;
    navigationRef.navigate('Main', {
      initialTab: tab,
      screen: tab,
    });
    return true;
  };

  if (tryNav()) return true;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (tryNav() || attempts >= 40) clearInterval(timer);
  }, 100);
  return true;
}

/**
 * URL → 탭 이동. MainStack 준비 전이면 pending에 저장.
 * @param {string} url
 * @param {{ deferIfNotReady?: boolean }} [opts]
 */
export function handleWidgetDeepLinkUrl(url, { deferIfNotReady = true } = {}) {
  const tab = parseWidgetDeepLinkTab(url);
  if (!tab) return false;

  if (!navigationRef.isReady()) {
    if (deferIfNotReady) stashWidgetDeepLinkTab(tab);
    return false;
  }

  return navigateToMainTab(tab);
}
