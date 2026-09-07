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

  const requestClose = () => {
    if (closingRef.current || !visibleRef.current) return;
    closingRef.current = true;
    visibleRef.current = false;
    setVisible(false);
  };

  useEffect(() => {
    return appAlert.subscribe((payload) => {
      queueRef.current.push(payload);
      if (!visibleRef.current && !closingRef.current) {
        present(queueRef.current.shift());
      }
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
    requestClose();
    if (typeof button?.onPress === 'function') {
      requestAnimationFrame(() => button.onPress());
    }
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
      onDismissed={presentNextOrClear}
    >
      {titleText !== '' ? (
        <Text
          style={{
            fontSize: 18,
            color: colors.textPrimary,
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
            color: colors.textSecondary,
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
            color: colors.textLight40,
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
                    ? colors.textLight5
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
                  color: isCancel ? colors.textSecondary : colors.textWhite,
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
