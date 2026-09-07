import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { colors } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createSignupStyles } from '../../../styles/login.style';
import { useAuth } from '../../../context/AuthContext';
import SubHeader from '../../frame/subHeader';
import SignStepNeisPlusSubmit from './SignStepNeisPlusSubmit';

/**
 * 거절 후 나이스+ 재제출 — 재학증명서 가이드와 동일 좌우 여백
 */
const NeisPlusResubmit = ({ navigation }) => {
  const { refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(
    () => createSignupStyles(width, normalize),
    [width, normalize],
  );

  return (
    <View style={local.root}>
      <SubHeader
        title="NEIS+ 제출"
        onBack={() => navigation.goBack()}
      />
      <View style={[local.body, { paddingHorizontal: width * 0.07 }]}>
        <SignStepNeisPlusSubmit
          styles={styles}
          normalize={normalize}
          mode="resubmit"
          layout="stable"
          insetBody={false}
          onSubmitted={async (data) => {
            await refreshStudentVerification();
            Alert.alert(
              '제출 완료',
              data?.message ||
                'NEIS+ 사진이 제출되었습니다. 관리자 승인을 기다려 주세요.',
            );
            if (typeof navigation.closeFlow === 'function') {
              navigation.closeFlow();
            } else {
              navigation.goBack();
            }
          }}
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

export default NeisPlusResubmit;
