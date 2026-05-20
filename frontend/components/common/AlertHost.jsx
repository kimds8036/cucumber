import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles/colors';
import AppPopupModal from './AppPopupModal';
import { appAlert } from '../../utils/appAlert';
import { isPostActionConfirmAlert } from '../../utils/postActionAlert';

export default function AlertHost() {
  const [currentAlert, setCurrentAlert] = useState(null);
  const queueRef = useRef([]);

  const dequeueNext = () => {
    if (queueRef.current.length === 0) {
      setCurrentAlert(null);
      return;
    }
    const next = queueRef.current.shift();
    setCurrentAlert(next);
  };

  useEffect(() => {
    return appAlert.subscribe((payload) => {
      queueRef.current.push(payload);
      setCurrentAlert((prev) => prev ?? queueRef.current.shift() ?? null);
    });
  }, []);

  const buttons = useMemo(
    () => (Array.isArray(currentAlert?.buttons) && currentAlert.buttons.length > 0
      ? currentAlert.buttons
      : [{ text: '확인' }]),
    [currentAlert],
  );

  const close = () => dequeueNext();

  const handlePress = (button) => {
    close();
    if (typeof button?.onPress === 'function') {
      requestAnimationFrame(() => button.onPress());
    }
  };

  const titleText = String(currentAlert?.title ?? '').trim();
  const dismissOnBackdrop = !isPostActionConfirmAlert(currentAlert);

  return (
    <AppPopupModal
      visible={Boolean(currentAlert)}
      onClose={close}
      animationType="none"
      dismissOnBackdrop={dismissOnBackdrop}
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
            lineHeight: 20,
            marginBottom: 16,
          }}
        >
          {currentAlert.message}
        </Text>
      )}

      <View style={{ flexDirection: buttons.length > 2 ? 'column' : 'row', gap: 8 }}>
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
                  : (isCancel ? colors.textLight5 : colors.primary),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => handlePress(button)}
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
