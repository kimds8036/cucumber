import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import UserAvatar from '../UserAvatar';
import { colors, fonts } from '../../styles/colors';

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
    Math.max(4, seat.seatX + seat.studyW / 2 - TIP_W / 2),
    Math.max(4, (Number(stageW) || TIP_W + 8) - TIP_W - 4),
  );
  const top = Math.max(4, seat.seatY - TIP_H + 2);
  const addDisabled = isFriend || requestSent;
  const addLabel = isFriend ? '이미 친구' : requestSent ? '요청함' : '친구추가하기';

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        tipStyles.wrap,
        { left, top, width: TIP_W, zIndex: 220 },
        animStyle,
      ]}
    >
      <View style={tipStyles.card}>
        <View style={tipStyles.row}>
          <View style={tipStyles.avatar}>
            <UserAvatar
              uri={avatarUrl}
              size={32}
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

const tipStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignItems: 'center',
    transformOrigin: '50% 100%',
  },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  id: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  addBtn: {
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnOff: {
    backgroundColor: colors.textLight1,
  },
  addText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  addTextOff: {
    color: colors.textLight4,
  },
  caret: {
    width: 10,
    height: 10,
    marginTop: -5,
    backgroundColor: colors.white,
    transform: [{ rotate: '45deg' }],
  },
});
