/**
 * 등교 미니게임 호스트
 * - 상단: 등교 진행 + 세션(오전 10시) 안내
 * - 본문: games/registry 에서 선택한 독립 게임 모듈
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import SubHeader from '../frame/subHeader';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { getCommuteGameSessionHint } from '../../utils/commuteUtils';
import { loadCommuteCompletedToday } from '../../utils/commuteStorage';
import { api } from '../../utils/api';
import {
  DEFAULT_COMMUTE_GAME_ID,
  getMiniGame,
} from '../../games/registry';

export default function CommuteBreakoutGame() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const gameDef = getMiniGame(DEFAULT_COMMUTE_GAME_ID);
  const GameComponent = gameDef.Component;

  const [commuteDone, setCommuteDone] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    let mounted = true;
    let userId = null;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        userId = res.data?.data?.id ?? null;
        if (!mounted || userId == null) return;
        if (await loadCommuteCompletedToday(userId)) setCommuteDone(true);
      } catch {
        /* ignore */
      }
    })();
    const id = setInterval(async () => {
      if (userId == null) return;
      try {
        if (await loadCommuteCompletedToday(userId)) setCommuteDone(true);
      } catch {
        /* ignore */
      }
    }, 2000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (commuteDone) return undefined;
    const id = setInterval(() => {
      setActiveDot((prev) => (prev + 1) % 3);
    }, 550);
    return () => clearInterval(id);
  }, [commuteDone]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SubHeader
        title={gameDef.title}
        onBack={() => navigation.goBack()}
      />

      <View style={styles.statusCard}>
        <View style={styles.progressRow}>
          {commuteDone ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={normalize(16)}
                color={colors.primaryDark}
              />
              <Text style={styles.progressLabel}>등교 완료</Text>
            </>
          ) : (
            <>
              <FontAwesome5
                name="walking"
                size={normalize(13)}
                color={colors.primaryDark}
              />
              <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        opacity: i === activeDot ? 1 : 0.28,
                        transform: [{ scale: i === activeDot ? 1.15 : 1 }],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressLabel}>등교중</Text>
            </>
          )}
        </View>
        <Text style={styles.sessionHint}>{getCommuteGameSessionHint()}</Text>
        <Text style={styles.footerNote}>
          등교가 끝나도 이 화면의 게임은 이어집니다
        </Text>
      </View>

      <View style={styles.gameSlot}>
        <GameComponent />
      </View>
    </SafeAreaView>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    statusCard: {
      marginHorizontal: normalize(16),
      marginBottom: normalize(10),
      paddingHorizontal: normalize(14),
      paddingVertical: normalize(12),
      borderRadius: normalize(14),
      backgroundColor: colors.primaryLight20,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      marginBottom: normalize(6),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(3),
    },
    dot: {
      width: normalize(5),
      height: normalize(5),
      borderRadius: normalize(3),
      backgroundColor: colors.primaryDark,
    },
    progressLabel: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: colors.textPrimary,
    },
    sessionHint: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.textSecondary,
      lineHeight: normalize(16),
      marginBottom: normalize(4),
    },
    footerNote: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.primaryDark,
    },
    gameSlot: {
      flex: 1,
      marginHorizontal: normalize(16),
      marginBottom: normalize(8),
    },
  });
}
