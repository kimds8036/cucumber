import React, { useEffect, useMemo, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import UserAvatar from '../UserAvatar';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/timer';

const TIP_W = 128;
const TIP_H = 88;
const OPEN_MS = 180;
const CLOSE_MS = 160;

/**
 * 착석 캐릭터 머리 위 프로필. 캐릭터에서 슉 나오고 다시 슉 들어감.
 */
export default function StudyRoomProfileTip({
  visible,
  seat,
  stageW,
  username,
  userId,
  profileColorId,
  avatarUrl,
  isFriend,
  requestSent,
  onAddFriend,
  onDismissed,
}) {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const tipStyles = useMemo(() => createTipStyles(normalize), [normalize]);
  const tipW = normalize(TIP_W);
  const tipH = normalize(TIP_H);
  const progress = useSharedValue(0);
  const shownRef = useRef(false);
  const onDismissedRef = useRef(onDismissed);
  onDismissedRef.current = onDismissed;

  const notifyDismissed = () => {
    onDismissedRef.current?.();
  };

  useEffect(() => {
    if (visible) {
      shownRef.current = true;
      progress.value = withTiming(1, {
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
      });
      return undefined;
    }
    if (!shownRef.current) return undefined;
    progress.value = withTiming(
      0,
      { duration: CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (ok) => {
        if (ok) runOnJS(notifyDismissed)();
      },
    );
    return undefined;
  }, [visible, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 18 },
      { scale: 0.28 + progress.value * 0.72 },
    ],
  }));

  if (!seat) return null;

  const left = Math.min(
    Math.max(4, seat.seatX + seat.studyW / 2 - tipW / 2),
    Math.max(4, (Number(stageW) || tipW + 8) - tipW - 4),
  );
  const top = Math.max(4, seat.seatY - tipH + 2);
  const addDisabled = isFriend || requestSent;
  const addLabel = isFriend ? '이미 친구입니다' : requestSent ? '요청 완료' : '친구 추가하기';

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        tipStyles.wrap,
        { left, top, width: tipW, zIndex: 220 },
        animStyle,
      ]}
    >
      <View style={tipStyles.card}>
        <View style={tipStyles.row}>
          <View style={tipStyles.avatar}>
            <UserAvatar
              uri={avatarUrl}
              size={normalize(32)}
              colorId={profileColorId}
              seed={userId}
            />
          </View>
          <Text style={tipStyles.id} numberOfLines={1}>
            {username || '학생'}
          </Text>
        </View>
        <TouchableOpacity
          style={[tipStyles.addBtn, addDisabled && tipStyles.addBtnOff]}
          onPress={addDisabled ? undefined : onAddFriend}
          activeOpacity={0.85}
          disabled={addDisabled}
        >
          <Text
            style={[tipStyles.addText, addDisabled && tipStyles.addTextOff]}
          >
            {addLabel}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={tipStyles.caret} />
    </Animated.View>
  );
}

const createTipStyles = (normalize) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      alignItems: 'center',
      transformOrigin: '50% 100%',
    },
    card: {
      width: '100%',
      backgroundColor: colors.white,
      borderRadius: normalize(14),
      paddingHorizontal: normalize(10),
      paddingVertical: normalize(8),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      marginBottom: normalize(8),
    },
    avatar: {
      width: normalize(32),
      height: normalize(32),
      borderRadius: normalize(16),
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    id: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.lg),
      color: colors.text,
    },
    addBtn: {
      height: normalize(30),
      borderRadius: normalize(10),
      backgroundColor: colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addBtnOff: {
      backgroundColor: colors.textLight1,
    },
    addText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: colors.white,
    },
    addTextOff: {
      color: colors.textLight4,
    },
    caret: {
      width: normalize(10),
      height: normalize(10),
      marginTop: -normalize(5),
      backgroundColor: colors.white,
      transform: [{ rotate: '45deg' }],
    },
  });
