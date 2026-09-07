/**
 * 훈민정음 멀티플레이 — 최대 6인 / 라운드 10초 / 선착 정답 +1 · 20점 선취
 * 좌·우 3명 · 중앙 초성·점수판 · 제출 답변 말풍선
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { themedTextInputProps } from '../../styles/mypage.style';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import AppPopupModal from '../../components/common/AppPopupModal';

const ROUND_MS = 10000;
const WIN_SCORE = 20;
const SEAT_COUNT = 6;
const SEAT_COL_W = 88;

/** 슬롯별 구분색 — 앱 초록 제외 */
const PLAYER_PALETTE = [
  { accent: '#C45C26', soft: '#FFF1E8', ink: '#8B3A12' },
  { accent: '#4F7CAC', soft: '#EAF1F8', ink: '#2A4A6E' },
  { accent: '#A67C52', soft: '#F6EFE7', ink: '#5C4028' },
  { accent: '#8B6FA8', soft: '#F2ECF7', ink: '#4A3560' },
  { accent: '#C4893A', soft: '#FBF3E6', ink: '#6E4A18' },
  { accent: '#B06B76', soft: '#F7EBED', ink: '#6A353C' },
];

const EMPTY_PALETTE = {
  accent: '#C8C2BA',
  soft: '#F3F1EE',
  ink: colors.textSecondary,
};

function paletteForSeat(seatIndex) {
  return PLAYER_PALETTE[seatIndex % PLAYER_PALETTE.length] || EMPTY_PALETTE;
}

function SpeechBubble({ text, side, styles }) {
  if (!text) return null;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.bubbleWrap,
        side === 'left' ? styles.bubbleWrapLeft : styles.bubbleWrapRight,
      ]}
    >
      <View style={styles.bubbleBody}>
        <Text style={styles.bubbleText} numberOfLines={2}>
          {text}
        </Text>
      </View>
      <View
        style={[
          styles.bubbleTail,
          side === 'left' ? styles.bubbleTailLeft : styles.bubbleTailRight,
        ]}
      />
    </View>
  );
}

function PlayerSeat({
  player,
  isYou,
  bubble,
  side,
  seatIndex,
  isRoundWinner,
  styles,
}) {
  const palette = player ? paletteForSeat(seatIndex) : EMPTY_PALETTE;
  return (
    <View style={styles.seatSlot}>
      <View
        style={[
          styles.seatCard,
          { backgroundColor: player ? palette.soft : EMPTY_PALETTE.soft },
          {
            // 배지처럼 테두리 폭 고정 — 색만 바꿔 레이아웃 튀김 방지
            borderColor: isRoundWinner ? palette.accent : 'transparent',
          },
          !player && styles.seatEmptyCard,
        ]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: palette.accent },
            !player && styles.avatarEmpty,
          ]}
        >
          <Text style={[styles.avatarText, !player && styles.avatarTextEmpty]}>
            {player ? (isYou ? '나' : (player.username || '?').slice(0, 1)) : '·'}
          </Text>
        </View>
        <Text
          style={[styles.seatName, player && { color: palette.ink }]}
          numberOfLines={1}
        >
          {player ? (isYou ? '나' : player.username || '플레이어') : '빈자리'}
        </Text>
        <Text style={[styles.seatScore, player && { color: palette.accent }]}>
          {player ? `${Number(player.score) || 0}점` : '—'}
        </Text>
      </View>
      <SpeechBubble text={bubble} side={side} styles={styles} />
    </View>
  );
}

export default function HunminGame() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const { socket } = useSocket();
  const inputRef = useRef(null);

  const [phase, setPhase] = useState('connecting');
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [round, setRound] = useState(null);
  const [result, setResult] = useState(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [remainMs, setRemainMs] = useState(ROUND_MS);
  const [username, setUsername] = useState('');
  const [bubbles, setBubbles] = useState({});
  const [matchEnd, setMatchEnd] = useState(null);
  const [rematchSearching, setRematchSearching] = useState(false);
  const matchedRef = useRef(false);
  const phaseRef = useRef(phase);
  const inMatchRef = useRef(false); // 한 번이라도 라운드 시작 후엔 대기실 UI 숨김
  phaseRef.current = phase;

  const inputTranslateY = useSharedValue(0);
  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        inputTranslateY.value = -Math.max(e.height - insets.bottom, 0);
      },
      onEnd: (e) => {
        'worklet';
        inputTranslateY.value = -Math.max(e.height - insets.bottom, 0);
      },
    },
    [insets.bottom],
  );
  const inputAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inputTranslateY.value }],
  }));
  const arenaAnimStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-inputTranslateY.value, 0),
  }));

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const u = res.data?.data;
        if (!mounted) return;
        setUsername(u?.username || u?.name || `유저${u?.id || ''}`);
      } catch {
        if (mounted) setUsername('나');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rematch = useCallback(() => {
    if (!socket) return;
    socket.emit('hunmin:leave');
    matchedRef.current = false;
    inMatchRef.current = false;
    setTimeout(() => {
      matchedRef.current = true;
      setPhase('connecting');
      setResult(null);
      setRound(null);
      setSubmitted(false);
      setInput('');
      setBubbles({});
      setMatchEnd(null);
      setRematchSearching(true);
      socket.emit('hunmin:match', { username });
    }, 120);
  }, [socket, username]);

  useEffect(() => {
    if (!socket?.connected || !username) return undefined;
    matchedRef.current = true;
    setPhase('connecting');
    socket.emit('hunmin:match', { username });
    return () => {
      if (matchedRef.current) {
        socket.emit('hunmin:leave');
        matchedRef.current = false;
      }
    };
  }, [socket, socket?.connected, username]);

  useEffect(() => {
    if (!socket) return undefined;

    const onJoined = (payload) => {
      setRoom(payload.room);
      setYou(payload.you);
      setRematchSearching(false);
      const st = payload.room?.status;
      if (payload.mode === 'waiting') {
        setPhase('waiting');
      } else if (st === 'playing' || st === 'reveal') {
        inMatchRef.current = true;
        setPhase(st);
      } else {
        setPhase('lobby');
      }
      if (payload.message) {
        setFeedback({ type: 'info', text: payload.message });
      }
    };
    const onRoom = (payload) => {
      setRoom(payload);
      const uid = you?.userId;
      const inWaiting = payload.waiting?.some((p) => p.userId === uid);
      if (payload.status === 'match_end') {
        setPhase('match_end');
        return;
      }
      if (inWaiting) {
        setPhase('waiting');
        return;
      }
      if (payload.status === 'playing' && phaseRef.current === 'playing') {
        return;
      }
      // 라운드 사이 lobby 브로드캐스트는 대기실로 바꾸지 않음
      // 단, 인원 부족·퇴장 후 대기면 대기실로
      if (payload.status === 'lobby') {
        const n = payload.players?.length || 0;
        if (n < 2) {
          inMatchRef.current = false;
          setPhase('lobby');
          setRound(null);
          return;
        }
        if (
          inMatchRef.current ||
          phaseRef.current === 'reveal' ||
          phaseRef.current === 'playing'
        ) {
          return;
        }
        setPhase('lobby');
        return;
      }
      if (payload.status === 'playing') setPhase('playing');
      if (payload.status === 'reveal') setPhase('reveal');
    };
    const onRoundStart = (payload) => {
      inMatchRef.current = true;
      setRound(payload.round);
      setResult(null);
      setSubmitted(false);
      // 입력창은 채팅처럼 유지(라운드 전환 시 강제 비우지 않음)
      setBubbles({});
      setMatchEnd(null);
      setRematchSearching(false);
      setFeedback({
        type: 'info',
        text: '가장 먼저 맞춘 사람이 점수를 가져가요!',
      });
      setPhase('playing');
      setRemainMs(
        Math.max(
          0,
          (payload.round?.endsAt || Date.now() + ROUND_MS) - Date.now(),
        ),
      );
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };
    const onRoundEnd = (payload) => {
      setResult(payload.result);
      setRoom(payload.room);
      setPhase('reveal');
      setRound(null);
      setSubmitted(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };
    const onAnswerResult = (payload) => {
      setFeedback({
        type: payload.ok ? 'ok' : 'err',
        text: payload.message || (payload.ok ? '선착 정답!' : '다시 입력해 보세요'),
      });
      // 오답·오타: 잠그지 않음. 선착 정답만 이번 라운드 제출 완료
      setSubmitted(Boolean(payload.ok));
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };
    const onAnswerProgress = (payload) => {
      if (payload?.userId == null) return;
      setBubbles((prev) => ({
        ...prev,
        [payload.userId]: String(payload.word || ''),
      }));
    };
    const onMatchEnd = (payload) => {
      inMatchRef.current = false;
      setMatchEnd(payload);
      setRoom(payload.room);
      setPhase('match_end');
      setRematchSearching(true);
      setRound(null);
    };
    const onRematchSearch = (payload) => {
      setRematchSearching(true);
      if (payload?.room) setRoom(payload.room);
      setMatchEnd(null);
      setPhase('lobby');
      setBubbles({});
      setResult(null);
      setFeedback({
        type: 'info',
        text: payload?.message || '방을 새로 찾는 중…',
      });
    };

    socket.on('hunmin:joined', onJoined);
    socket.on('hunmin:room', onRoom);
    socket.on('hunmin:round_start', onRoundStart);
    socket.on('hunmin:round_end', onRoundEnd);
    socket.on('hunmin:answer_result', onAnswerResult);
    socket.on('hunmin:answer_progress', onAnswerProgress);
    socket.on('hunmin:match_end', onMatchEnd);
    socket.on('hunmin:rematch_search', onRematchSearch);

    return () => {
      socket.off('hunmin:joined', onJoined);
      socket.off('hunmin:room', onRoom);
      socket.off('hunmin:round_start', onRoundStart);
      socket.off('hunmin:round_end', onRoundEnd);
      socket.off('hunmin:answer_result', onAnswerResult);
      socket.off('hunmin:answer_progress', onAnswerProgress);
      socket.off('hunmin:match_end', onMatchEnd);
      socket.off('hunmin:rematch_search', onRematchSearch);
    };
  }, [socket, you?.userId]);

  useEffect(() => {
    if (phase !== 'playing' || !round?.endsAt) return undefined;
    const tick = setInterval(() => {
      setRemainMs(Math.max(0, round.endsAt - Date.now()));
    }, 200);
    return () => clearInterval(tick);
  }, [phase, round?.endsAt]);

  const onSubmit = () => {
    const word = input.trim();
    if (!word) return;

    // 채팅처럼 전송 즉시 비우고 포커스 유지 → 오타/오답 바로 재입력
    setInput('');
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });

    if (!socket) return;
    if (phase !== 'playing') {
      setFeedback({
        type: 'info',
        text: '라운드가 시작되면 제출돼요. 계속 입력해 두세요!',
      });
      return;
    }
    if (submitted) {
      setFeedback({ type: 'info', text: '이번 라운드 정답을 이미 맞췄어요.' });
      return;
    }

    socket.emit('hunmin:answer', { word });
  };

  const choseong = round?.choseong || result?.choseong || [];
  const players = room?.players || [];
  const waiting = room?.waiting || [];
  const seats = Array.from({ length: SEAT_COUNT }, (_, i) => players[i] || null);
  const leftSeats = seats.slice(0, 3);
  const rightSeats = seats.slice(3, 6);
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
  const winScore = room?.winScore || WIN_SCORE;
  const winnerIds = new Set((result?.winners || []).map((w) => w.userId));

  const matchWinnerNames = (matchEnd?.winners || [])
    .map((w) => w.username)
    .join(', ');

  const showGameCenter =
    phase === 'playing' ||
    phase === 'reveal' ||
    (inMatchRef.current && phase !== 'match_end' && phase !== 'waiting');

  const showLobbyOnly =
    phase === 'lobby' && !inMatchRef.current && !rematchSearching;

  const renderSeatCol = (list, side, indexOffset) => (
    <View style={styles.seatCol}>
      {list.map((p, i) => {
        const seatIndex = indexOffset + i;
        const isYou = p && you && p.userId === you.userId;
        const bubble = p ? bubbles[p.userId] : null;
        const isRoundWinner =
          phase === 'reveal' && p && winnerIds.has(p.userId);
        return (
          <PlayerSeat
            key={`${side}-${i}`}
            player={p}
            isYou={Boolean(isYou)}
            bubble={bubble}
            side={side}
            seatIndex={seatIndex}
            isRoundWinner={Boolean(isRoundWinner)}
            styles={styles}
          />
        );
      })}
    </View>
  );

  const scoreSlots = Array.from({ length: SEAT_COUNT }, (_, idx) => ({
    p: players[idx] || null,
    idx,
  }));

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, normalize(4)) }]}>
      <View style={styles.guideBox}>
        <Text style={styles.guideLine}>
          초성에 맞는 단어를 가장 먼저 맞추면 +1점
        </Text>
        <Text style={styles.guideLine}>
          {winScore}점을 먼저 얻는 사람이 승리합니다
        </Text>
      </View>

      <View style={styles.roomMeta}>
        <Text style={styles.roomMetaText}>
          방 {room?.roomId || '—'} · {players.length}/{SEAT_COUNT}
          {waiting.length > 0 ? ` · 대기 ${waiting.length}` : ''}
        </Text>
        <Pressable onPress={rematch} hitSlop={8}>
          <Text style={styles.rematch}>다시 매칭</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.arena, arenaAnimStyle]}>
        {renderSeatCol(leftSeats, 'left', 0)}

        <View style={styles.centerCol}>
          {phase === 'connecting' && (
            <View style={styles.centerBox}>
              <ActivityIndicator color={colors.primaryDark} />
              <Text style={styles.centerText}>방 찾는 중…</Text>
            </View>
          )}
          {phase === 'waiting' && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>라운드 진행 중</Text>
              <Text style={styles.centerText}>끝나면 자동 입장</Text>
            </View>
          )}
          {showLobbyOnly && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>대기실</Text>
              <Text style={styles.centerText}>
                {`2명 이상이면 시작 · 정원 ${SEAT_COUNT}명`}
              </Text>
            </View>
          )}
          {rematchSearching && phase === 'lobby' && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>재매칭</Text>
              <Text style={styles.centerText}>방을 새로 찾는 중…</Text>
            </View>
          )}
          {showGameCenter && (
            <View style={styles.centerPlay}>
              {phase === 'playing' ? (
                <Text style={styles.timer}>{sec}</Text>
              ) : (
                <Text style={styles.centerTitle}>
                  {result?.winners?.length ? '선착 정답!' : '다음 라운드'}
                </Text>
              )}
              <View style={styles.choRow}>
                {choseong.length > 0
                  ? choseong.map((c, idx) => (
                      <View key={`${c}-${idx}`} style={styles.choTile}>
                        <Text style={styles.choChar}>{c}</Text>
                      </View>
                    ))
                  : null}
              </View>
              <View style={styles.scoreBoard}>
                <Text style={styles.scoreBoardTitle}>점수 · {winScore}점</Text>
                <View style={styles.scoreGrid}>
                  {scoreSlots.map(({ p, idx }) => {
                    const palette = paletteForSeat(idx);
                    const isYou = p && you && p.userId === you.userId;
                    return (
                      <View
                        key={`sc-${idx}`}
                        style={[
                          styles.scoreCell,
                          isYou && {
                            borderColor: palette.accent,
                            backgroundColor: palette.soft,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.scoreDot,
                            {
                              backgroundColor: p
                                ? palette.accent
                                : EMPTY_PALETTE.accent,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.scoreNum,
                            isYou && {
                              color: palette.ink,
                              fontFamily: fonts.bold,
                            },
                          ]}
                        >
                          {p ? Number(p.score) || 0 : '—'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
              {phase === 'reveal' && result ? (
                <Text style={styles.resultHint}>
                  {result.winners?.length
                    ? `${(result.winners || []).map((w) => w.username).join(', ')}`
                    : '정답 없음'}
                </Text>
              ) : null}
            </View>
          )}
          {phase === 'match_end' && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>경기 종료</Text>
              <Text style={styles.centerText}>방을 새로 찾는 중…</Text>
            </View>
          )}
        </View>

        {renderSeatCol(rightSeats, 'right', 3)}
      </Animated.View>

      {phase !== 'connecting' && phase !== 'match_end' ? (
        <Animated.View style={[styles.inputRow, inputAnimStyle]}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            editable
            placeholder="채팅처럼 입력 후 전송"
            placeholderTextColor={colors.textLight20}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={onSubmit}
            showSoftInputOnFocus
            {...themedTextInputProps}
          />
          <Pressable style={styles.submitBtn} onPress={onSubmit}>
            <Text style={styles.submitText}>전송</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <AppPopupModal
        visible={Boolean(matchEnd) && rematchSearching}
        onClose={() => {}}
        dismissOnBackdrop={false}
        dismissOnBackPress={false}
      >
        <Text style={styles.popupTitle}>경기 종료</Text>
        <Text style={styles.popupBody}>
          {matchWinnerNames
            ? `${matchWinnerNames} 님이 ${winScore}점으로 승리했습니다!`
            : `${winScore}점 선취 경기가 끝났습니다.`}
        </Text>
        <Text style={styles.popupSearching}>방을 새로 찾는 중…</Text>
      </AppPopupModal>
    </View>
  );
}

function createStyles(normalize) {
  const colW = normalize(SEAT_COL_W);
  return StyleSheet.create({
    root: { flex: 1 },
    guideBox: {
      marginBottom: normalize(4),
      paddingHorizontal: normalize(4),
    },
    guideLine: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(16),
    },
    roomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(4),
    },
    roomMetaText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.textSecondary,
    },
    rematch: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.primaryDark,
    },
    arena: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minHeight: normalize(240),
      paddingTop: normalize(2),
    },
    seatCol: {
      width: colW,
      alignItems: 'center',
      gap: normalize(4),
      zIndex: 2,
    },
    seatSlot: {
      width: normalize(68),
      position: 'relative',
      alignItems: 'center',
      overflow: 'visible',
    },
    seatCard: {
      width: normalize(68),
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(3),
      borderRadius: normalize(10),
      alignItems: 'center',
      borderWidth: 2.5,
      borderColor: 'transparent',
    },
    seatEmptyCard: {
      backgroundColor: '#F3F1EE',
    },
    avatar: {
      width: normalize(28),
      height: normalize(28),
      borderRadius: normalize(14),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: normalize(2),
    },
    avatarText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: '#FFFFFF',
    },
    avatarEmpty: {
      backgroundColor: '#DDD8D0',
    },
    avatarTextEmpty: {
      color: colors.textSecondary,
    },
    seatName: {
      fontFamily: fonts.bold,
      fontSize: normalize(10),
      color: colors.textSecondary,
      maxWidth: normalize(64),
    },
    seatScore: {
      fontFamily: fonts.regular,
      fontSize: normalize(10),
      color: colors.textSecondary,
    },
    bubbleWrap: {
      position: 'absolute',
      top: normalize(4),
      maxWidth: normalize(54),
      zIndex: 5,
      alignItems: 'center',
    },
    bubbleWrapLeft: {
      left: normalize(66),
      alignItems: 'flex-start',
    },
    bubbleWrapRight: {
      right: normalize(66),
      alignItems: 'flex-end',
    },
    bubbleBody: {
      backgroundColor: '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#D0CBC4',
      borderRadius: normalize(10),
      paddingHorizontal: normalize(6),
      paddingVertical: normalize(4),
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 2,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    bubbleTail: {
      position: 'absolute',
      top: normalize(10),
      width: 0,
      height: 0,
      borderTopWidth: normalize(5),
      borderBottomWidth: normalize(5),
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    bubbleTailLeft: {
      left: normalize(-5),
      borderRightWidth: normalize(6),
      borderRightColor: '#FFFFFF',
    },
    bubbleTailRight: {
      right: normalize(-5),
      borderLeftWidth: normalize(6),
      borderLeftColor: '#FFFFFF',
    },
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: normalize(10),
      lineHeight: normalize(13),
      color: colors.textPrimary,
    },
    centerCol: {
      flex: 1,
      maxWidth: normalize(200),
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(6),
    },
    centerPlay: {
      width: '100%',
      alignItems: 'center',
    },
    centerBox: {
      alignItems: 'center',
      gap: normalize(8),
    },
    centerTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textPrimary,
      textAlign: 'center',
    },
    centerText: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(18),
    },
    timer: {
      fontFamily: fonts.bold,
      fontSize: normalize(28),
      color: '#C45C26',
      textAlign: 'center',
      marginBottom: normalize(6),
      alignSelf: 'center',
      width: '100%',
    },
    choRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      gap: normalize(8),
      marginBottom: normalize(10),
    },
    choTile: {
      width: normalize(44),
      height: normalize(44),
      borderRadius: normalize(10),
      backgroundColor: '#FFF4E8',
      borderWidth: 1.5,
      borderColor: '#E8A06A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    choChar: {
      fontFamily: fonts.bold,
      fontSize: normalize(20),
      color: '#C45C26',
      textAlign: 'center',
    },
    scoreBoard: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: normalize(168),
      paddingHorizontal: normalize(4),
      paddingVertical: normalize(4),
    },
    scoreBoardTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(6),
    },
    scoreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: normalize(6),
    },
    scoreCell: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalize(6),
      paddingVertical: normalize(5),
      borderRadius: normalize(8),
      borderWidth: 2,
      borderColor: 'transparent',
    },
    scoreDot: {
      width: normalize(10),
      height: normalize(10),
      borderRadius: normalize(5),
    },
    scoreNum: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      minWidth: normalize(16),
      textAlign: 'center',
    },
    resultHint: {
      marginTop: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: '#C45C26',
      textAlign: 'center',
    },
    inputRow: {
      flexDirection: 'row',
      gap: normalize(8),
      marginTop: normalize(10),
      marginBottom: normalize(4),
    },
    input: {
      flex: 1,
      height: normalize(46),
      borderRadius: normalize(12),
      borderWidth: 1,
      borderColor: colors.textLight10,
      backgroundColor: colors.background,
      paddingHorizontal: normalize(14),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.xl),
      color: colors.textPrimary,
    },
    submitBtn: {
      height: normalize(46),
      paddingHorizontal: normalize(16),
      borderRadius: normalize(12),
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitDisabled: { opacity: 0.55 },
    submitText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: colors.textWhite,
    },
    feedback: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: normalize(6),
    },
    feedbackOk: { color: '#4F7CAC' },
    feedbackErr: { color: '#C45C26' },
    popupTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(18),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    popupBody: {
      fontFamily: fonts.regular,
      fontSize: normalize(14),
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(12),
    },
    popupSearching: {
      fontFamily: fonts.bold,
      fontSize: normalize(14),
      color: colors.primaryDark,
      textAlign: 'center',
    },
  });
}
