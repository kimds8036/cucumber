import React from 'react';
import { View } from 'react-native';
import { useGuideFocusRef } from '../../hooks/useGuideFocusRef';

/**
 * 가이드 하이라이트 대상 — 내부 View 에 measureInWindow ref 부착
 * @param {string} name — focusTarget 키 (GuideOverlayScreen GUIDE_STEPS)
 */
export function GuideFocusTarget({ name, children, style, ...rest }) {
  const { ref, onLayout } = useGuideFocusRef(name);

  return (
    <View
      ref={ref}
      onLayout={onLayout}
      collapsable={false}
      style={style}
      {...rest}
    >
      {children}
    </View>
  );
}
