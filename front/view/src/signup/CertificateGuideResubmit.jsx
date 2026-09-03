import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createSignupStyles } from '../../../styles/login.style';
import SubHeader from '../../frame/subHeader';
import SignStepCertificateGuide from './SignStepCertificateGuide';

/**
 * 거절 후 재학증명서 가이드 — 가입 플로우와 동일 가이드, SafeArea 는 App 셸
 */
const CertificateGuideResubmit = ({ navigation, onProceed }) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createSignupStyles(width, normalize),
    [width, normalize],
  );

  return (
    <View style={local.root}>
      <SubHeader
        title="재학증명서 가이드"
        onBack={() => navigation.goBack()}
      />
      <View style={[local.body, { paddingHorizontal: width * 0.07 }]}>
        <SignStepCertificateGuide
          styles={styles}
          onProceed={onProceed}
          insetBody={false}
        />
      </View>
    </View>
  );
};

const local = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default CertificateGuideResubmit;
