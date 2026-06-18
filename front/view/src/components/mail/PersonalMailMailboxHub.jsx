import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Pressable, Animated } from 'react-native';
import { createPersonalMailHubStyles } from '../../../../styles/personalMailHub.style';
import MailboxLottieAnimation from './MailboxLottieAnimation';
import CloudSpeechMenu from './CloudSpeechMenu';

export default function PersonalMailMailboxHub({
  normalize,
  stats = {},
  onOpenReceived,
  onOpenReturned,
  onOpenSent,
  onCompose,
}) {
  const styles = useMemo(
    () => createPersonalMailHubStyles(normalize),
    [normalize],
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [bubbleMounted, setBubbleMounted] = useState(false);
  const bubbleProgress = useRef(new Animated.Value(0)).current;

  const { unreadCount = 0, returnedCount = 0 } = stats;
  const slideOffset = normalize(16);

  useEffect(() => {
    if (menuOpen) {
      setBubbleMounted(true);
      Animated.spring(bubbleProgress, {
        toValue: 1,
        useNativeDriver: true,
        tension: 68,
        friction: 10,
      }).start();
      return;
    }

    Animated.timing(bubbleProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setBubbleMounted(false);
    });
  }, [menuOpen, bubbleProgress, slideOffset]);

  const cloudAnimatedStyle = {
    opacity: bubbleProgress,
    transform: [
      {
        translateY: bubbleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [slideOffset, 0],
        }),
      },
      {
        scale: bubbleProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
    ],
  };

  const options = [
    {
      key: 'received',
      label:
        unreadCount > 0
          ? `온 우편 확인 (${unreadCount}통 안 읽음)`
          : '온 우편 확인',
      onPress: onOpenReceived,
    },
    {
      key: 'returned',
      label:
        returnedCount > 0
          ? `반송된 우편 (${returnedCount}통)`
          : '반송된 우편',
      onPress: onOpenReturned,
    },
    {
      key: 'compose',
      label: '우편 쓰기',
      onPress: onCompose,
    },
    {
      key: 'sent',
      label: '보낸 우편 보기',
      onPress: onOpenSent,
    },
  ];

  const handleMailboxPress = () => {
    setMenuOpen((open) => !open);
  };

  const handleChoice = (action) => {
    setMenuOpen(false);
    action?.();
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => menuOpen && setMenuOpen(false)}
    >
      <View style={styles.centerStage}>
        <View style={styles.mailboxSlot}>
          {bubbleMounted ? (
            <Animated.View
              style={[styles.cloudOverlay, cloudAnimatedStyle]}
              pointerEvents={menuOpen ? 'auto' : 'none'}
            >
              <CloudSpeechMenu
                styles={styles}
                normalize={normalize}
                options={options}
                onSelect={handleChoice}
              />
            </Animated.View>
          ) : null}

          <TouchableOpacity
            style={styles.mailboxPressable}
            onPress={handleMailboxPress}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel="우편함 열기"
          >
            <MailboxLottieAnimation
              style={styles.lottie}
              normalize={normalize}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}
