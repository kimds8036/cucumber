import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
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
                if (w > 0) setSlotWidth(w);
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
                    onPress={() => setBoardFeedMode('national')}
                  >
                    <Text
                      style={[
                        modeStyles.segLabel,
                        boardFeedMode === 'national'
                          ? modeStyles.segLabelActive
                          : modeStyles.segLabelMuted,
                      ]}
                    >
                      전체
                    </Text>
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
                    onPress={() => setBoardFeedMode('student')}
                  >
                    <Text
                      style={[
                        modeStyles.segLabel,
                        boardFeedMode === 'student'
                          ? modeStyles.segLabelActive
                          : modeStyles.segLabelMuted,
                      ]}
                    >
                      학생
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
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
      alignSelf: 'center',
      height: rowHeight,
      justifyContent: 'center',
      overflow: 'visible',
    },
    measureRow: {
      position: 'absolute',
      opacity: 0,
      paddingHorizontal: normalize(6),
      minWidth: normalize(52),
      height: rowHeight,
      alignItems: 'center',
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
      paddingHorizontal: normalize(6),
      alignItems: 'center',
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
  });
}

export default MainHeader;
