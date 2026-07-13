import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
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
import { AD_PLACEMENTS } from '../../constants/adPlacements';
import { useAdSlots } from '../../hooks/useAdSlots';
import { useAuth } from '../../context/AuthContext';

const HIDE_TODAY_KEY = '@cucumber/launch_ad_hidden_day_v1';

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
 */
export default function LaunchAdModal({ children }) {
  const { isLoggedIn, authHydrated } = useAuth();
  const { adSlots, loading } = useAdSlots(AD_PLACEMENTS.LAUNCH_MODAL);
  const ad = adSlots[0] ?? null;

  const [checkedStorage, setCheckedStorage] = useState(false);
  const [hiddenToday, setHiddenToday] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => createStyles(normalize, insets.bottom),
    [normalize, insets.bottom],
  );

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

  const onClose = useCallback(() => {
    setDismissed(true);
  }, []);

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
          animationType="slide"
          onRequestClose={onClose}
        >
          <View style={styles.overlay}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.sheet}>
              <View style={styles.handle} />
              {ad.imageUrl ? (
                <Image
                  source={{ uri: ad.imageUrl }}
                  style={styles.image}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={styles.imagePlaceholderText}>광고</Text>
                </View>
              )}
              <Text style={styles.title} numberOfLines={2}>
                {ad.title || '광고'}
              </Text>
              {ad.subtitle || ad.body ? (
                <Text style={styles.subtitle} numberOfLines={3}>
                  {ad.subtitle || ad.body}
                </Text>
              ) : null}
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
            </View>
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
      paddingTop: n(10),
      paddingBottom: n(16) + bottomInset,
      alignItems: 'center',
    },
    handle: {
      width: n(40),
      height: n(4),
      borderRadius: n(2),
      backgroundColor: colors.textLight20,
      marginBottom: n(16),
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
