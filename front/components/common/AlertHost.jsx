import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import AppPopupModal from './AppPopupModal';
import { appAlert } from '../../utils/appAlert';

/**
 * Alert.alert / appAlert → 시간표 「저장 완료」와 동일 AppPopupModal 셸.
 * visible만 토글하고, 페이드 동안 카드 내용은 유지한다.
 */
export default function AlertHost() {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef([]);
  const visibleRef = useRef(false);
  const closingRef = useRef(false);
  const pendingPressRef = useRef(null);

  const present = (payload) => {
    setCurrentAlert(payload);
    visibleRef.current = true;
    closingRef.current = false;
    setVisible(true);
  };

  const presentNextOrClear = () => {
    closingRef.current = false;
    if (queueRef.current.length > 0) {
      present(queueRef.current.shift());
      return;
    }
    visibleRef.current = false;
    setVisible(false);
    setCurrentAlert(null);
  };

  const handleDismissed = () => {
    const press = pendingPressRef.current;
    pendingPressRef.current = null;
    presentNextOrClear();
    // 페이드 끝난 뒤에 네비게이션 등 onPress 실행 — 닫히는 중 화면이 바뀌며 튀는 현상 방지
    if (typeof press === 'function') {
      queueMicrotask(press);
    }
  };

  const requestClose = () => {
    if (closingRef.current || !visibleRef.current) return;
    closingRef.current = true;
    visibleRef.current = false;
    setVisible(false);
  };

  useEffect(() => {
    return appAlert.subscribe((payload) => {
      queueRef.current.push(payload);
      // subscribe 동기 flush / 마운트 직전 setState 레이스 방지
      queueMicrotask(() => {
        if (!visibleRef.current && !closingRef.current) {
          if (queueRef.current.length === 0) return;
          present(queueRef.current.shift());
        }
      });
    });
  }, []);

  const buttons = useMemo(
    () =>
      Array.isArray(currentAlert?.buttons) && currentAlert.buttons.length > 0
        ? currentAlert.buttons
        : [{ text: '확인' }],
    [currentAlert],
  );

  const handlePress = (button) => {
    pendingPressRef.current =
      typeof button?.onPress === 'function' ? button.onPress : null;
    requestClose();
  };

  const titleText = String(currentAlert?.title ?? '').trim();
  const noteText = currentAlert?.options?.note
    ? String(currentAlert.options.note)
    : '';

  return (
    <AppPopupModal
      visible={visible}
      onClose={requestClose}
      dismissOnBackdrop={false}
      onDismissed={handleDismissed}
    >
      {titleText !== '' ? (
        <Text
          style={{
            fontSize: 18,
            color: colors.text,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          {titleText}
        </Text>
      ) : null}
      {!!currentAlert?.message && (
        <Text
          style={{
            fontSize: 14,
            color: colors.textLight4,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: noteText ? 8 : 16,
          }}
        >
          {currentAlert.message}
        </Text>
      )}
      {!!noteText && (
        <Text
          style={{
            fontSize: 12,
            color: colors.textLight3,
            textAlign: 'center',
            lineHeight: 16,
            marginBottom: 16,
          }}
        >
          {noteText}
        </Text>
      )}

      <View
        style={{
          flexDirection: buttons.length > 2 ? 'column' : 'row',
          gap: 8,
        }}
      >
        {buttons.map((button, idx) => {
          const text = button?.text || '확인';
          const isDestructive = button?.style === 'destructive';
          const isCancel = button?.style === 'cancel';
          return (
            <TouchableOpacity
              key={`${text}-${idx}`}
              style={{
                flex: buttons.length > 2 ? 0 : 1,
                height: 42,
                borderRadius: 10,
                backgroundColor: isDestructive
                  ? colors.alert
                  : isCancel
                    ? colors.textLight1
                    : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => handlePress(button)}
              activeOpacity={0.85}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: isCancel ? colors.textLight4 : colors.white,
                }}
              >
                {text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </AppPopupModal>
  );
}
