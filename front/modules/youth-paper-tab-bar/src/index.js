import {
  requireNativeViewManager,
  requireOptionalNativeModule,
} from 'expo-modules-core';

// requireNativeViewManager는 모듈이 없어도 예외 없이 빈 뷰를 돌려주므로 먼저 모듈 유무를 본다.
export const NativeTabBarView = requireOptionalNativeModule('YouthPaperTabBar')
  ? requireNativeViewManager('YouthPaperTabBar')
  : null;
