/**
 * 공부 잔디 — 연·월 휠 시트. 회원가입 생년월일 picker 시트(취소 / 제목 / 확인)와 같은 모양.
 * DateTimePicker에 연·월 전용 모드가 없어서 두 칸 휠을 직접 그린다.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Modal,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Animated,
} from 'react-native';

const VISIBLE_ROWS = 5;
const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const toMonthIndex = ({ year, month }) => year * 12 + month;

function clampYearMonth(v, min, max) {
  const idx = toMonthIndex(v);
  if (idx < toMonthIndex(min)) return { ...min };
  if (idx > toMonthIndex(max)) return { ...max };
  return v;
}

const WheelColumn = forwardRef(function WheelColumn(
  { items, selectedIndex, onChange, styles, itemHeight },
  ref,
) {
  const scrollRef = useRef(null);
  const lastIndexRef = useRef(selectedIndex);
  const offsetYRef = useRef(selectedIndex * itemHeight);

  useImperativeHandle(ref, () => ({
    readIndex() {
      const idx = Math.round(offsetYRef.current / itemHeight);
      return Math.max(0, Math.min(items.length - 1, idx));
    },
  }), [itemHeight, items.length]);

  useEffect(() => {
    const animated = lastIndexRef.current !== selectedIndex;
    lastIndexRef.current = selectedIndex;
    offsetYRef.current = selectedIndex * itemHeight;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * itemHeight, animated });
    }, 0);
    return () => clearTimeout(t);
  }, [selectedIndex, itemHeight]);

  const settle = (y) => {
    const idx = Math.max(0, Math.min(items.length - 1, Math.round(y / itemHeight)));
    lastIndexRef.current = idx;
    if (idx !== selectedIndex) onChange(idx);
    else scrollRef.current?.scrollTo({ y: idx * itemHeight, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.ymWheelColumn, { height: itemHeight * VISIBLE_ROWS }]}
      contentContainerStyle={{ paddingVertical: itemHeight * 2 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={(e) => {
        offsetYRef.current = e.nativeEvent.contentOffset.y;
      }}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => {
        const v = e.nativeEvent.velocity?.y ?? 0;
        if (Math.abs(v) < 0.05) settle(e.nativeEvent.contentOffset.y);
      }}
    >
      {items.map((item, idx) => (
        <TouchableOpacity
          key={item.key}
          activeOpacity={0.6}
          onPress={() => onChange(idx)}
          style={[styles.ymWheelItem, { height: itemHeight }]}
        >
          <Text
            style={[
              styles.ymWheelText,
              idx === selectedIndex && styles.ymWheelTextSelected,
              item.disabled && styles.ymWheelTextDisabled,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
});

export default function TimerYearMonthPicker({
  visible,
  value,
  min,
  max,
  onConfirm,
  onClose,
  styles,
  normalize,
}) {
  const itemHeight = normalize(40);
  const [draft, setDraft] = useState(value);
  const yearWheelRef = useRef(null);
  const monthWheelRef = useRef(null);
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    dismissingRef.current = false;
    sheetTranslateY.setValue(600);
    Animated.timing(sheetTranslateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

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

  const years = [];
  for (let y = min.year; y <= max.year; y += 1) years.push(y);

  const confirm = () => {
    const yearIdx = yearWheelRef.current?.readIndex?.() ?? years.indexOf(draft.year);
    const monthIdx = monthWheelRef.current?.readIndex?.() ?? draft.month;
    const picked = clampYearMonth(
      {
        year: years[yearIdx] ?? draft.year,
        month: MONTHS[monthIdx] ?? draft.month,
      },
      min,
      max,
    );
    dismiss(() => onConfirm(picked));
  };
  const yearItems = years.map((y) => ({ key: `y-${y}`, label: `${y}년` }));
  const monthItems = MONTHS.map((m) => ({
    key: `m-${m}`,
    label: `${m + 1}월`,
    disabled:
      toMonthIndex({ year: draft.year, month: m }) < toMonthIndex(min) ||
      toMonthIndex({ year: draft.year, month: m }) > toMonthIndex(max),
  }));

  const changeYear = (idx) => {
    setDraft((prev) => clampYearMonth({ year: years[idx], month: prev.month }, min, max));
  };
  const changeMonth = (idx) => {
    setDraft((prev) => clampYearMonth({ year: prev.year, month: idx }, min, max));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => dismiss()}
      statusBarTranslucent
    >
      <View style={{ width: Dimensions.get('screen').width, height: Dimensions.get('screen').height }}>
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
          <Text style={styles.ymToolbarTitle}>연월 선택</Text>
          <TouchableOpacity onPress={confirm} hitSlop={8}>
            <Text style={[styles.ymToolbarBtn, styles.ymToolbarOk]}>확인</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ymWheelWrap}>
          <View
            pointerEvents="none"
            style={[
              styles.ymWheelHighlight,
              { top: itemHeight * 2, height: itemHeight },
            ]}
          />
          <WheelColumn
            ref={yearWheelRef}
            items={yearItems}
            selectedIndex={Math.max(0, years.indexOf(draft.year))}
            onChange={changeYear}
            styles={styles}
            itemHeight={itemHeight}
          />
          <WheelColumn
            ref={monthWheelRef}
            items={monthItems}
            selectedIndex={draft.month}
            onChange={changeMonth}
            styles={styles}
            itemHeight={itemHeight}
          />
        </View>
      </Animated.View>
      </View>
    </Modal>
  );
}
