/**
 * 타이머 년·월·일 picker — 회원가입 생년월일 단계와 같은 DateTimePicker spinner
 * iOS: 하단 시트(취소 · 제목 · 확인) / Android: 네이티브 다이얼로그
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../../styles/colors';

export default function TimerDatePicker({
  visible,
  value,
  title = '날짜 선택',
  minimumDate,
  maximumDate,
  onConfirm,
  onClose,
  styles,
  normalize,
}) {
  const [draft, setDraft] = useState(value);
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    if (Platform.OS !== 'ios') return;
    dismissingRef.current = false;
    sheetTranslateY.setValue(600);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={(event, date) => {
          onClose();
          if (event.type === 'dismissed' || !date) return;
          onConfirm(date);
        }}
      />
    );
  }

  const dismiss = (afterDismiss) => {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    Animated.timing(sheetTranslateY, {
      toValue: 600,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      dismissingRef.current = false;
      onClose();
      afterDismiss?.();
    });
  };

  const confirm = () => {
    const picked = draft;
    dismiss(() => onConfirm(picked));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
    >
      <View style={styles.ymOverlay}>
        <Pressable style={styles.ymOverlayTouch} onPress={() => dismiss()} />
      </View>
      <Animated.View
        style={[styles.ymSheet, { transform: [{ translateY: sheetTranslateY }] }]}
      >
        <View style={styles.ymToolbar}>
          <TouchableOpacity onPress={() => dismiss()} hitSlop={8}>
            <Text style={styles.ymToolbarBtn}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.ymToolbarTitle}>{title}</Text>
          <TouchableOpacity onPress={confirm} hitSlop={8}>
            <Text style={[styles.ymToolbarBtn, styles.ymToolbarOk]}>확인</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.datePickerWheelWrap, { height: normalize(216) }]}>
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            locale="ko-KR"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, date) => {
              if (date) setDraft(date);
            }}
            themeVariant="light"
            textColor={colors.text}
            style={{ width: '100%', height: normalize(216) }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}
