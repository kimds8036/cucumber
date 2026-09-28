import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import SubHeader from '../../frame/subHeader';
import SignStepAltVerifyChoice from './SignStepAltVerifyChoice';

/**
 * 거절 후 대안 인증 선택 — SubHeader로 학생인증·NEIS+ 등과 동일 헤더
 */
const AltVerifyChoiceResubmit = ({
  navigation,
  onSelectNeisPlus,
  onSelectCertificate,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);

  return (
    <View style={styles.root}>
      <SubHeader
        title="인증 방법 선택"
        onBack={() => navigation.goBack()}
      />
      <View style={[styles.body, { paddingHorizontal: width * 0.07 }]}>
        <SignStepAltVerifyChoice
          normalize={normalize}
          onSelectNeisPlus={onSelectNeisPlus}
          onSelectCertificate={onSelectCertificate}
          insetBody={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default AltVerifyChoiceResubmit;
