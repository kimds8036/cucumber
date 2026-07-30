import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../../styles/colors';
import { getNormalize } from '../../../styles/frame.style';
import { createSignupStyles } from '../../../styles/login.style';
import SignStepCertificateGuide from './SignStepCertificateGuide';

/**
 * 거절 후 재학증명서 가이드 — 가입 플로우와 동일 가이드, SafeArea 는 App 셸
 */
const CertificateGuideResubmit = ({ navigation, onProceed }) => {
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
          재학증명서 가이드
        </Text>
        <View style={{ width: normalize(24) }} />
      </View>
      <View style={local.body}>
        <SignStepCertificateGuide styles={styles} onProceed={onProceed} />
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

export default CertificateGuideResubmit;
