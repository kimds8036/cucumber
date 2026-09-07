/**
 * 등교 미니게임 호스트
 * - SubHeader 우측: 등교중 칩
 * - 본문: games/registry 미니게임 (안내·플레이는 게임 모듈)
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SubHeader from '../frame/subHeader';
import CommuteHeaderChip from '../../components/CommuteHeaderChip';
import { colors } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
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
        rightElement={
          <CommuteHeaderChip
            phase={commuteDone ? 'done' : 'tracking'}
            activeDot={activeDot}
          />
        }
      />

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
    gameSlot: {
      flex: 1,
      marginHorizontal: normalize(16),
      marginBottom: normalize(8),
    },
  });
}
