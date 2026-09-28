import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../../styles/colors';

/** 가입 스텝 공통 — X 그만두기 + 짧은 제목 + 진행 바 */
const AuthSignupStepHeader = ({
  styles,
  normalize,
  title,
  progressWidth = 0,
  onAbort,
  abortDisabled = false,
}) => (
  <View style={styles.headerSection}>
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onAbort}
          disabled={abortDisabled}
          accessibilityRole="button"
          accessibilityLabel="가입 중단"
        >
          <Feather name="x" size={normalize(20)} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progressWidth}%` }]} />
      </View>
    </View>
  </View>
);

export default AuthSignupStepHeader;
