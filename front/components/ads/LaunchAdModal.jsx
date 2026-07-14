import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { useAuth } from '../../context/AuthContext';

const HIDE_TODAY_KEY = '@cucumber/launch_ad_hidden_day_v1';
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.9;

function getTodayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function isHiddenToday() {
  try {
    const stored = await AsyncStorage.getItem(HIDE_TODAY_KEY);
    return stored === getTodayKey();
  } catch {
    return false;
  }
}

async function hideForToday() {
  try {
    await AsyncStorage.setItem(HIDE_TODAY_KEY, getTodayKey());
  } catch {
    /* ignore */
  }
}

/**
 * OfflineGate → ForceUpdateGate 통과 후, AuthProvider 안에서 마운트.
 * 광고 없거나 오늘 숨김이면 모달 자체를 렌더하지 않음 (Tip 금지).
 *
 * TODO: /api/ads 연동 후 launch_modal 슬롯으로 ad 공급
 */
export default function LaunchAdModal({ children }) {
  const { isLoggedIn, authHydrated } = useAuth();
  // API 연동 전: 빈 슬롯 → 모달 미표시
  const ad = null;
  const loading = false;

  const [checkedStorage, setCheckedStorage] = useState(false);
  const [hiddenToday, setHiddenToday] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const { width, height } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(normalize, insets.bottom),
    [normalize, insets.bottom],
  );

  const translateY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const hidden = await isHiddenToday();
      if (mounted) {
        setHiddenToday(hidden);
        setCheckedStorage(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const visible =
    authHydrated &&
    isLoggedIn &&
    checkedStorage &&
    !loading &&
    ad != null &&
    !hiddenToday &&
    !dismissed;

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const onClose = useCallback(() => {
    setDismissed(true);
  }, []);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.timing(translateY, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
      else closingRef.current = false;
    });
  }, [height, onClose, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldDismiss =
            gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY;
          if (shouldDismiss) {
            animateClose();
            return;
          }
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        },
      }),
    [animateClose, translateY],
  );

  const onHideToday = useCallback(async () => {
    await hideForToday();
    setHiddenToday(true);
    setDismissed(true);
  }, []);

  const onCta = useCallback(async () => {
    const url = ad?.ctaUrl;
    if (url) {
      try {
        await Linking.openURL(url);
      } catch {
        /* ignore */
      }
    }
    setDismissed(true);
  }, [ad?.ctaUrl]);

  return (
    <>
      {children}
      {visible ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={animateClose}
        >
          <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={animateClose} />
            <Animated.View
              style={[styles.sheet, { transform: [{ translateY }] }]}
            >
              <View
                collapsable={false}
                style={styles.dragRegion}
                {...panResponder.panHandlers}
              >
                <View style={styles.handleHit}>
                  <View style={styles.handle} />
                </View>
                {ad.imageUrl ? (
                  <Image
                    source={{ uri: ad.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    pointerEvents="none"
                  />
                ) : (
                  <View
                    style={[styles.image, styles.imagePlaceholder]}
                    pointerEvents="none"
                  >
                    <Text style={styles.imagePlaceholderText}>광고</Text>
                  </View>
                )}
                <Text style={styles.title} numberOfLines={2} pointerEvents="none">
                  {ad.title || '광고'}
                </Text>
                {ad.subtitle || ad.body ? (
                  <Text
                    style={styles.subtitle}
                    numberOfLines={3}
                    pointerEvents="none"
                  >
                    {ad.subtitle || ad.body}
                  </Text>
                ) : null}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  pressed && styles.ctaPressed,
                ]}
                onPress={onCta}
              >
                <Text style={styles.ctaText}>자세히 보기</Text>
              </Pressable>
              <Pressable onPress={onHideToday} hitSlop={8}>
                <Text style={styles.hideToday}>오늘 하루 보지 않기</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function createStyles(n, bottomInset) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: n(20),
      borderTopRightRadius: n(20),
      paddingHorizontal: n(20),
      paddingTop: n(4),
      paddingBottom: n(16) + bottomInset,
      alignItems: 'center',
    },
    dragRegion: {
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    handleHit: {
      alignSelf: 'stretch',
      alignItems: 'center',
      paddingVertical: n(10),
    },
    handle: {
      width: n(40),
      height: n(4),
      borderRadius: n(2),
      backgroundColor: colors.textLight20,
    },
    image: {
      width: '100%',
      height: n(160),
      borderRadius: n(12),
      marginBottom: n(16),
      backgroundColor: colors.primaryLight20,
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagePlaceholderText: {
      fontFamily: fonts.regular,
      fontSize: n(fontSizes.lg),
      color: colors.textSecondary,
    },
    title: {
      alignSelf: 'stretch',
      fontFamily: fonts.bold,
      fontSize: n(fontSizes.title),
      color: colors.textPrimary,
      marginBottom: n(8),
    },
    subtitle: {
      alignSelf: 'stretch',
      fontFamily: fonts.regular,
      fontSize: n(fontSizes.lg),
      color: colors.textSecondary,
      lineHeight: n(22),
      marginBottom: n(20),
    },
    cta: {
      alignSelf: 'stretch',
      backgroundColor: colors.primary,
      borderRadius: n(12),
      paddingVertical: n(14),
      alignItems: 'center',
      marginBottom: n(14),
    },
    ctaPressed: {
      opacity: 0.85,
    },
    ctaText: {
      fontFamily: fonts.bold,
      fontSize: n(fontSizes.xl),
      color: colors.textWhite ?? colors.background,
    },
    hideToday: {
      fontFamily: fonts.regular,
      fontSize: n(fontSizes.lg),
      color: colors.textMuted ?? colors.textSecondary,
      paddingVertical: n(8),
    },
  });
}
