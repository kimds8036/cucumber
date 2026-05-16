import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../../../../styles/colors';

const MENU_MIN_WIDTH = 216;
const MENU_ESTIMATE_H = 168;
const GAP = 10;
const ARROW = 9;

const CARD_BG = 'rgba(255,255,255,0.97)';
const CARD_BORDER = '#E0E0E0';

/**
 * 말풍선 롱프레스 플로팅 메뉴 — 단색 카드, 커스텀 삭제 확인, 복사는 부모 토스트
 */
export default function MessageLongPressMenu({
  visible,
  msg,
  anchor,
  onClose,
  onCopy,
  onReply,
  onDeleteMessage,
  onToast,
  normalize,
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const confirmOpacity = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.96)).current;
  const [layoutH, setLayoutH] = useState(MENU_ESTIMATE_H);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const reopeningMenuRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setDeleteConfirm(false);
      opacity.setValue(0);
      scale.setValue(0.94);
      confirmOpacity.setValue(0);
      confirmScale.setValue(0.96);
    }
  }, [visible, opacity, scale, confirmOpacity, confirmScale]);

  const placement = useMemo(() => {
    if (!anchor) return { above: true, top: 120, left: 16, arrowLeft: 100 };
    const centerX = anchor.x + anchor.width / 2;
    const spaceAbove = anchor.y - insets.top;
    const useAbove = spaceAbove > layoutH + GAP + ARROW + 48;
    const menuW = Math.min(MENU_MIN_WIDTH, screenW - 32);
    let left = centerX - menuW / 2;
    left = Math.max(12, Math.min(left, screenW - menuW - 12));
    let top;
    if (useAbove) {
      top = anchor.y - layoutH - GAP - ARROW;
      top = Math.max(insets.top + 8, top);
    } else {
      top = anchor.y + anchor.height + GAP + ARROW;
      const maxTop = screenH - layoutH - insets.bottom - 24;
      if (top > maxTop) top = Math.max(insets.top + 8, maxTop);
    }
    const bubbleCenter = anchor.x + anchor.width / 2;
    let arrowLeft = bubbleCenter - left - ARROW;
    arrowLeft = Math.max(18, Math.min(arrowLeft, menuW - 18 - ARROW * 2));
    return { above: useAbove, top, left, arrowLeft, menuW };
  }, [anchor, screenW, screenH, insets.top, insets.bottom, layoutH]);

  useEffect(() => {
    if (!visible || deleteConfirm) return;
    (async () => {
      if (!reopeningMenuRef.current) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {
          /* ignore */
        }
      } else {
        reopeningMenuRef.current = false;
      }
    })();
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, deleteConfirm, opacity, scale]);

  useEffect(() => {
    if (!visible || !deleteConfirm) return;
    confirmOpacity.setValue(0);
    confirmScale.setValue(0.96);
    Animated.parallel([
      Animated.spring(confirmScale, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(confirmOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, deleteConfirm, confirmOpacity, confirmScale]);

  if (!msg) return null;

  const canCopy = Boolean(msg.content && String(msg.content).trim());
  const canDelete = msg.isMe && !msg.is_deleted;

  const runClose = (fn) => {
    onClose();
    requestAnimationFrame(() => fn?.());
  };

  const handleCopy = async () => {
    if (!canCopy) return;
    const text = String(msg.content ?? '').trim();
    onClose();
    requestAnimationFrame(async () => {
      try {
        const result = await Promise.resolve(onCopy(text));
        if (result === false) {
          onToast?.('복사에 실패했습니다');
        }
      } catch {
        onToast?.('복사에 실패했습니다');
      }
    });
  };

  const handleReply = () => {
    runClose(() => onReply(msg));
  };

  const handleDeletePress = () => {
    setDeleteConfirm(true);
  };

  const handleDeleteCancel = () => {
    reopeningMenuRef.current = true;
    setDeleteConfirm(false);
    opacity.setValue(1);
    scale.setValue(1);
  };

  const handleDeleteConfirm = () => {
    onDeleteMessage?.(msg.id);
    onClose();
  };

  const overlayPress = () => {
    onClose();
  };

  const radius = normalize(12);
  const cardStyle = {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: radius,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable style={styles.overlayFill} onPress={overlayPress} />

        {deleteConfirm ? (
          <View
            style={styles.confirmLayer}
            pointerEvents="box-none"
          >
            <Animated.View
              style={{
                opacity: confirmOpacity,
                transform: [{ scale: confirmScale }],
                width: '100%',
                maxWidth: normalize(300),
                paddingHorizontal: normalize(20),
              }}
            >
              <View style={[cardStyle, styles.confirmCard, { padding: normalize(18) }]}>
                <Text
                  style={{
                    fontSize: normalize(17),
                    fontFamily: fonts.bold,
                    color: colors.textPrimary,
                    marginBottom: normalize(8),
                  }}
                >
                  메시지 삭제
                </Text>
                <Text
                  style={{
                    fontSize: normalize(14),
                    fontFamily: fonts.regular,
                    color: colors.textSecondary,
                    lineHeight: normalize(20),
                    marginBottom: normalize(20),
                  }}
                >
                  이 메시지를 삭제하시겠어요?{'\n'}
                  상대방 화면에서도 삭제됩니다.
                </Text>
                <View style={styles.confirmActions}>
                  <Pressable
                    onPress={handleDeleteCancel}
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      styles.confirmBtnGhost,
                      {
                        borderRadius: normalize(10),
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: normalize(15),
                        fontFamily: fonts.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      취소
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleDeleteConfirm}
                    style={({ pressed }) => [
                      styles.confirmBtn,
                      {
                        borderRadius: normalize(10),
                        backgroundColor: CARD_BG,
                        borderWidth: 1,
                        borderColor: CARD_BORDER,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: normalize(15),
                        fontFamily: fonts.bold,
                        color: '#C62828',
                      }}
                    >
                      삭제
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        ) : (
          <Animated.View
            style={[
              styles.anchorWrap,
              {
                opacity,
                transform: [{ scale }],
                top: placement.top,
                left: placement.left,
                width: placement.menuW,
              },
            ]}
            pointerEvents="box-none"
          >
            <View
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (h > 0 && Math.abs(h - layoutH) > 2) setLayoutH(h);
              }}
              style={[
                styles.shadowWrap,
                Platform.OS === 'ios' ? styles.shadowSoftIos : styles.shadowSoftAndroid,
              ]}
              pointerEvents="auto"
            >
              <View
                style={[
                  cardStyle,
                  {
                    paddingVertical: normalize(4),
                    overflow: 'hidden',
                  },
                ]}
              >
                <MenuRow
                  normalize={normalize}
                  icon="copy-outline"
                  label="복사"
                  onPress={handleCopy}
                  disabled={!canCopy}
                />
                <MenuRow
                  normalize={normalize}
                  icon="arrow-undo-outline"
                  label="답장"
                  onPress={handleReply}
                />
                {canDelete ? (
                  <MenuRow
                    normalize={normalize}
                    icon="trash-outline"
                    label="삭제"
                    onPress={handleDeletePress}
                    destructive
                  />
                ) : null}
              </View>
              {placement.above ? (
                <View
                  style={[
                    styles.arrowDown,
                    {
                      left: placement.arrowLeft,
                      borderTopColor: '#FFFFFF',
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.arrowUp,
                    {
                      left: placement.arrowLeft,
                      borderBottomColor: '#FFFFFF',
                    },
                  ]}
                />
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function MenuRow({ normalize, icon, label, onPress, disabled, destructive }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
      style={({ pressed }) => [
        styles.row,
        {
          paddingVertical: normalize(13),
          paddingHorizontal: normalize(16),
          opacity: disabled ? 0.42 : pressed && !disabled ? 0.92 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={normalize(22)}
        color={destructive ? '#C62828' : colors.textPrimary}
        style={{ marginRight: normalize(14) }}
      />
      <Text
        style={[
          styles.rowLabel,
          {
            fontSize: normalize(16),
            fontFamily: fonts.bold,
            color: destructive ? '#C62828' : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlayFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayLight,
  },
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  confirmCard: {
    width: '100%',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  confirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  anchorWrap: {
    position: 'absolute',
  },
  shadowWrap: {
    position: 'relative',
  },
  shadowSoftIos: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  shadowSoftAndroid: {
    elevation: 3,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -ARROW + 1,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderTopWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    position: 'absolute',
    top: -ARROW + 1,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderRightWidth: ARROW,
    borderBottomWidth: ARROW,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    letterSpacing: 0.2,
  },
});
