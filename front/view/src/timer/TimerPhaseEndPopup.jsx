/**
 * 뽀모도로 집중·휴식이 끝났을 때 띄우는 알림.
 * 설정이 팝업일 때만 뜬다. 건너뛰기는 띄우지 않는다.
 * 등장·퇴장은 AppPopupModal 페이드(스르륵).
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';
import AppPopupModal from '../../../components/common/AppPopupModal';

function copyFor(notice) {
  if (notice?.endedPhase === 'focus') {
    return {
      title: '집중이 끝났어요',
      body: notice.nextPhase === 'long_break' ? '이제 긴 휴식이에요' : '이제 짧은 휴식이에요',
      icon: 'checkmark',
      focus: true,
    };
  }
  return {
    title: '휴식이 끝났어요',
    body: '이제 집중할 시간이에요',
    icon: 'cafe',
    focus: false,
  };
}

export default function TimerPhaseEndPopup({ notice, onClose, styles, normalize }) {
  const copy = copyFor(notice);
  return (
    <AppPopupModal
      visible={notice != null}
      onClose={onClose}
      dismissOnBackPress
      overlayColor="rgba(0,0,0,0.55)"
      cardStyle={styles.phaseEndCard}
    >
      <View
        style={[
          styles.phaseEndBadge,
          copy.focus ? styles.phaseEndBadgeFocus : styles.phaseEndBadgeBreak,
        ]}
      >
        <Ionicons name={copy.icon} size={normalize(36)} color={colors.white} />
      </View>
      <Text style={styles.phaseEndTitle}>{copy.title}</Text>
      <Text style={styles.phaseEndBody}>{copy.body}</Text>
      <TouchableOpacity
        style={[styles.phaseEndBtn, !copy.focus && styles.phaseEndBtnBreak]}
        onPress={onClose}
        activeOpacity={0.85}
      >
        <Text style={styles.phaseEndBtnText}>확인</Text>
      </TouchableOpacity>
    </AppPopupModal>
  );
}
