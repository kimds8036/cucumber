import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Switch,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../../styles/colors';

export default function TimerSettingsSheet({
  visible,
  onClose,
  styles,
  normalize,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.timerSettingsOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.timerSettingsSheet}>
              <View style={styles.timerSettingsHandle} />
              <Text style={styles.timerSettingsTitle}>타이머 설정</Text>

              <View style={styles.timerSettingsRow}>
                <View style={styles.timerSettingsRowText}>
                  <Text style={styles.timerSettingsLabel}>뽀모도로 모드</Text>
                  <Text style={styles.timerSettingsHint}>
                    집중·휴식 사이클은 곧 열려요
                  </Text>
                </View>
                <Switch
                  value={false}
                  disabled
                  trackColor={{
                    false: colors.textLight10,
                    true: colors.primary,
                  }}
                />
              </View>

              <TouchableOpacity
                style={styles.timerSettingsRow}
                activeOpacity={0.7}
                onPress={() => {}}
              >
                <View style={styles.timerSettingsRowText}>
                  <Text style={styles.timerSettingsLabel}>허용 앱 설정</Text>
                  <Text style={styles.timerSettingsHint}>
                    {Platform.OS === 'ios'
                      ? 'iOS에서는 앱 잠금이 제한될 수 있어요'
                      : '타이머 중 쓸 수 있는 앱을 고를 수 있어요'}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={normalize(18)}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.timerSettingsCloseBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.timerSettingsCloseText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
