import React from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

/** 회원가입 입력 단계 공통 스크롤 (키보드 높이 자동 반영) */
const SignupStepScroll = ({
  children,
  normalize,
  bottomOffset = 88,
  contentContainerStyle,
}) => (
  <KeyboardAwareScrollView
    style={{ flex: 1 }}
    contentContainerStyle={[
      { flexGrow: 1, paddingBottom: normalize(16) },
      contentContainerStyle,
    ]}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    bottomOffset={normalize(bottomOffset)}
  >
    {children}
  </KeyboardAwareScrollView>
);

export default SignupStepScroll;
