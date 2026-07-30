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
import SignStepAltVerifyChoice from './SignStepAltVerifyChoice';

/**
 * 거절 후 대안 인증 선택 — SafeArea 는 App 거절 플로우 셸에서만 처리
 */
const AltVerifyChoiceResubmit = ({
  navigation,
  onSelectNeisPlus,
  onSelectCertificate,
}) => {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const padX = width * 0.04;

  return (
    <View style={[styles.root, { paddingHorizontal: padX }]}>
      <View style={styles.header}>
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
        <Text style={[styles.headerTitle, { fontSize: normalize(18) }]}>
          인증 방법 선택
        </Text>
        <View style={{ width: normalize(24) }} />
      </View>
      <View style={styles.body}>
        <SignStepAltVerifyChoice
          normalize={normalize}
          onSelectNeisPlus={onSelectNeisPlus}
          onSelectCertificate={onSelectCertificate}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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

export default AltVerifyChoiceResubmit;
