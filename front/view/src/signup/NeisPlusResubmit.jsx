import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createSignupStyles } from '../../../styles/login.style';
import { useAuth } from '../../../context/AuthContext';
import SignStepNeisPlusSubmit from './SignStepNeisPlusSubmit';

/**
 * 거절 후 나이스+ 재제출 — 재학증명서 가이드와 동일 좌우 여백
 */
const NeisPlusResubmit = ({ navigation }) => {
  const { refreshStudentVerification } = useAuth();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const padX = width * 0.04;
  const styles = useMemo(
    () => createSignupStyles(width, normalize),
    [width, normalize],
  );

  return (
    <View style={[local.root, { paddingHorizontal: padX }]}>
      <View style={local.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={normalize(24)}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[local.headerTitle, { fontSize: normalize(18) }]}>
          나이스+ 제출
        </Text>
        <View style={{ width: normalize(24) }} />
      </View>
      <View style={local.body}>
        <SignStepNeisPlusSubmit
          styles={styles}
          normalize={normalize}
          mode="resubmit"
          layout="stable"
          onSubmitted={async (data) => {
            await refreshStudentVerification();
            Alert.alert(
              '제출 완료',
              data?.message ||
                '나이스+ 사진이 제출되었습니다. 관리자 승인을 기다려 주세요.',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
});

export default NeisPlusResubmit;
