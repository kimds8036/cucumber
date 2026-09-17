import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { createHeaderStyles, getNormalize } from '../../styles/frame.style';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { useNotification } from '../../context/NotificationContext';
import CommuteHeaderIndicator from '../../components/CommuteHeaderIndicator';
import {
  getMainTabTitle,
  useMainShellOptional,
} from '../../context/MainShellContext';
import { navigate as navigateRoot } from '../../navigation/navigationRef';

const FEED_MODE_TIP_KEY = '@board_feed_mode_tip_v1';
const FEED_MODE_TIP_MAX = 2;

const MainHeader = ({
  headerTitle: headerTitleProp,
  navigation: navigationProp,
}) => {
  const shell = useMainShellOptional();
  const headerTitle =
    headerTitleProp ??
    shell?.headerTitle ??
    getMainTabTitle(shell?.activeTab ?? 'board');
  const navigation = navigationProp ?? shell?.navigation;
  const { width, height } = useWindowDimensions();
  const headerStyles = useMemo(
    () => createHeaderStyles(width, height),
    [width, height],
  );
  const normalize = useMemo(() => getNormalize(width), [width]);
  const modeStyles = useMemo(() => createModeStyles(normalize), [normalize]);
  const { hasUnread } = useNotification();

  const isBoardTab = (shell?.activeTab ?? 'board') === 'board';
  const boardFeedMode = shell?.boardFeedMode ?? 'national';
  const setBoardFeedMode = shell?.setBoardFeedMode;

  const [slotWidth, setSlotWidth] = useState(0);
  const [tipVisible, setTipVisible] = useState(false);
  /** 0 = 전체 좌측, 1 = 학생 좌측 */
  const swap = useRef(
    new Animated.Value(boardFeedMode === 'student' ? 1 : 0),
  ).current;

  useEffect(() => {
    if (!isBoardTab) return;
    Animated.timing(swap, {
      toValue: boardFeedMode === 'student' ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [boardFeedMode, isBoardTab, swap]);

  useEffect(() => {
    if (!isBoardTab || !setBoardFeedMode) {
      setTipVisible(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FEED_MODE_TIP_KEY);
        const seen = Number(raw || 0);
        if (!cancelled && Number.isFinite(seen) && seen < FEED_MODE_TIP_MAX) {
          setTipVisible(true);
        }
      } catch {
        if (!cancelled) setTipVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isBoardTab, setBoardFeedMode]);

  const dismissFeedModeTip = useCallback(async () => {
    setTipVisible(false);
    try {
      const raw = await AsyncStorage.getItem(FEED_MODE_TIP_KEY);
      const seen = Number(raw || 0);
      const next = Math.min(
        FEED_MODE_TIP_MAX,
        (Number.isFinite(seen) ? seen : 0) + 1,
      );
      await AsyncStorage.setItem(FEED_MODE_TIP_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!tipVisible) return undefined;
    const timer = setTimeout(() => {
      dismissFeedModeTip();
    }, 5200);
    return () => clearTimeout(timer);
  }, [tipVisible, dismissFeedModeTip]);

  const handleFeedModePress = useCallback(
    (mode) => {
      if (mode !== boardFeedMode) {
        dismissFeedModeTip();
      }
      setBoardFeedMode?.(mode);
    },
    [boardFeedMode, dismissFeedModeTip, setBoardFeedMode],
  );

  const openScreen = (name) => {
    const names = navigation?.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes(name) && navigation?.navigate) {
      navigation.navigate(name);
      return;
    }
    const parent = navigation?.getParent?.();
    const parentNames = parent?.getState?.()?.routeNames;
    if (
      Array.isArray(parentNames) &&
      parentNames.includes(name) &&
      parent?.navigate
    ) {
      parent.navigate(name);
      return;
    }
    navigateRoot(name);
  };

  const nationalX = swap.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slotWidth],
  });
  const studentX = swap.interpolate({
    inputRange: [0, 1],
    outputRange: [slotWidth, 0],
  });

  const renderModeLabel = (label, active) => (
    <Text
      style={[
        modeStyles.segLabel,
        active ? modeStyles.segLabelActive : modeStyles.segLabelMuted,
      ]}
    >
      {label}
    </Text>
  );

  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.tabContainer}>
        {isBoardTab && setBoardFeedMode ? (
          <View
            style={[
              modeStyles.seg,
              slotWidth > 0 ? { width: slotWidth * 2 } : null,
            ]}
          >
            {/* 슬롯 너비 측정용 (보이지 않음) */}
            <View
              style={modeStyles.measureRow}
              pointerEvents="none"
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                // 글자 폭 + 라벨 간 간격 (좌측은 우리학교 타이틀과 동일하게 0부터)
                if (w > 0) setSlotWidth(w + normalize(14));
              }}
            >
              <Text style={[modeStyles.segLabel, modeStyles.segLabelActive]}>
                전체
              </Text>
            </View>

            {slotWidth > 0 ? (
              <>
                <Animated.View
                  style={[
                    modeStyles.segItem,
                    {
                      width: slotWidth,
                      transform: [{ translateX: nationalX }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={modeStyles.segBtn}
                    activeOpacity={0.85}
                    onPress={() => handleFeedModePress('national')}
                    accessibilityRole="button"
                    accessibilityLabel="전체 피드"
                    accessibilityState={{
                      selected: boardFeedMode === 'national',
                    }}
                  >
                    {renderModeLabel('전체', boardFeedMode === 'national')}
                  </TouchableOpacity>
                </Animated.View>
                <Animated.View
                  style={[
                    modeStyles.segItem,
                    {
                      width: slotWidth,
                      transform: [{ translateX: studentX }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={modeStyles.segBtn}
                    activeOpacity={0.85}
                    onPress={() => handleFeedModePress('student')}
                    accessibilityRole="button"
                    accessibilityLabel="학생 전용 피드"
                    accessibilityState={{
                      selected: boardFeedMode === 'student',
                    }}
                  >
                    {renderModeLabel('학생', boardFeedMode === 'student')}
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : null}

            {tipVisible ? (
              <TouchableOpacity
                style={modeStyles.tipBubble}
                activeOpacity={0.9}
                onPress={dismissFeedModeTip}
                accessibilityRole="button"
                accessibilityLabel="피드 전환 안내 닫기"
              >
                <Text style={modeStyles.tipText}>
                  탭해서 전체 ↔ 학생 피드를 바꿀 수 있어요
                </Text>
                <View style={modeStyles.tipArrow} />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <Text style={headerStyles.tabText}>{headerTitle}</Text>
        )}
      </View>

      <View style={headerStyles.buttonContainer}>
        <CommuteHeaderIndicator />
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => openScreen('Search')}
        >
          <Ionicons name="search" size={normalize(22)} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={headerStyles.iconButton}
          onPress={() => openScreen('Notification')}
        >
          <FontAwesome5
            name="bell"
            size={normalize(22)}
            color={colors.primary}
          />
          {hasUnread && <View style={headerStyles.badge} />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

function createModeStyles(normalize) {
  const labelSize = normalize(fontSizes.heading + 6); // tabText와 동일
  const rowHeight = normalize(40); // iconButton minHeight와 동일
  return StyleSheet.create({
    seg: {
      position: 'relative',
      alignSelf: 'flex-start',
      height: rowHeight,
      justifyContent: 'center',
      overflow: 'visible',
      zIndex: 5,
    },
    measureRow: {
      position: 'absolute',
      opacity: 0,
      paddingHorizontal: 0,
      minWidth: normalize(52),
      height: rowHeight,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    segItem: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      height: rowHeight,
      justifyContent: 'center',
    },
    segBtn: {
      flex: 1,
      height: rowHeight,
      paddingHorizontal: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    segLabel: {
      fontSize: labelSize,
      lineHeight: labelSize + normalize(4),
      fontFamily: fonts.bold,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    segLabelActive: {
      color: colors.textPrimary,
    },
    segLabelMuted: {
      color: colors.textLight40 || colors.textSecondary || '#9E9E9E',
      fontFamily: fonts.regular,
    },
    tipBubble: {
      position: 'absolute',
      left: 0,
      top: rowHeight + normalize(4),
      zIndex: 20,
      maxWidth: normalize(220),
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(8),
      borderRadius: normalize(10),
      backgroundColor: colors.textPrimary,
    },
    tipArrow: {
      position: 'absolute',
      top: normalize(-5),
      left: normalize(18),
      width: normalize(10),
      height: normalize(10),
      backgroundColor: colors.textPrimary,
      transform: [{ rotate: '45deg' }],
    },
    tipText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textWhite || '#fff',
      lineHeight: normalize(18),
    },
  });
}

export default MainHeader;
