import { requireNativeViewManager } from 'expo-modules-core';

export function getTabBarTestView() {
  try {
    return requireNativeViewManager('TabBarTest');
  } catch {
    return null;
  }
}
