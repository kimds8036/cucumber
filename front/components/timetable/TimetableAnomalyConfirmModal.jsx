import React, { useMemo } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AppPopupModal from '../common/AppPopupModal';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/mypage.style';
import { createTimetableViewStyles } from '../../src/screens/timetable/timetable.style';
import { getAnomalyConfirmMessage } from '../../utils/timetableAnomaly';

export default function TimetableAnomalyConfirmModal({
  visible,
  onDismiss,
  onEdit,
  onSave,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const modalStyles = useMemo(
    () => createTimetableViewStyles(normalize),
    [normalize],
  );
  const { title, body } = getAnomalyConfirmMessage();

  return (
    <AppPopupModal
      visible={visible}
      onClose={onDismiss}
      dismissOnBackdrop={false}
      dismissOnBackPress
    >
      <Text
        style={{
          fontSize: 18,
          color: colors.textPrimary,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
          marginBottom: 16,
        }}
      >
        {body}
      </Text>
      <View style={modalStyles.timetableResetModalActions}>
        <TouchableOpacity
          style={[
            modalStyles.timetableResetModalCancel,
            {
              height: 42,
              borderRadius: 10,
              backgroundColor: colors.textLight5,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={onEdit}
          activeOpacity={0.85}
        >
          <Text
            style={[
              modalStyles.timetableResetModalCancelText,
              {
                fontSize: 14,
                fontWeight: '700',
                color: colors.textSecondary,
              },
            ]}
          >
            수정하기
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            modalStyles.timetableResetModalDelete,
            {
              height: 42,
              borderRadius: 10,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
          onPress={onSave}
          activeOpacity={0.85}
        >
          <Text
            style={[
              modalStyles.timetableResetModalDeleteText,
              { fontSize: 14, fontWeight: '700', color: colors.textWhite },
            ]}
          >
            저장하기
          </Text>
        </TouchableOpacity>
      </View>
    </AppPopupModal>
  );
}
