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
const SEAT_COL_W = 52;
/** 말풍선 표시 후 자동 숨김 */
const BUBBLE_TTL_MS = 3000;

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

const BUBBLE_BORDER = '#D0CBC4';
const BUBBLE_FILL = '#FFFFFF';

function SpeechBubble({ text, side, styles }) {
  if (!text) return null;
  const isLeft = side === 'left';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.bubbleWrap,
        isLeft ? styles.bubbleWrapLeft : styles.bubbleWrapRight,
      ]}
    >
      {/* 테두리용 큰 꼬리 + 안쪽 흰 꼬리 */}
      <View
        style={[
          styles.bubbleTailBorder,
          isLeft ? styles.bubbleTailBorderLeft : styles.bubbleTailBorderRight,
        ]}
      />
      <View
        style={[
          styles.bubbleTailFill,
          isLeft ? styles.bubbleTailFillLeft : styles.bubbleTailFillRight,
        ]}
      />
      <View style={styles.bubbleBody}>
        <Text style={styles.bubbleText} numberOfLines={2}>
          {text}
        </Text>
      </View>
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
    <View style={[styles.seatSlot, bubble ? styles.seatSlotRaised : null]}>
      {side === 'right' ? (
        <SpeechBubble text={bubble} side={side} styles={styles} />
      ) : null}
      <View style={styles.seatStack}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: player ? palette.accent : EMPTY_PALETTE.accent },
            isRoundWinner && {
              borderColor: palette.accent,
              borderWidth: 2.5,
            },
            !player && styles.avatarEmpty,
          ]}
        />
        <Text
          style={[styles.seatName, player && { color: palette.ink }]}
          numberOfLines={1}
        >
          {player ? (isYou ? '나' : player.username || '플레이어') : '빈자리'}
        </Text>
        <Text style={[styles.seatScore, player && { color: palette.accent }]}>
          {player ? `${Number(player.score) || 0}` : '—'}
        </Text>
      </View>
      {side === 'left' ? (
        <SpeechBubble text={bubble} side={side} styles={styles} />
      ) : null}
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
  const bubbleTimersRef = useRef({});
  phaseRef.current = phase;

  const showBubble = useCallback((userId, text) => {
    if (userId == null) return;
    const msg = String(text || '').trim();
    if (!msg) return;
    setBubbles((prev) => ({ ...prev, [userId]: msg }));
    const prevTimer = bubbleTimersRef.current[userId];
    if (prevTimer) clearTimeout(prevTimer);
    bubbleTimersRef.current[userId] = setTimeout(() => {
      setBubbles((prev) => {
        if (prev[userId] !== msg) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      delete bubbleTimersRef.current[userId];
    }, BUBBLE_TTL_MS);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(bubbleTimersRef.current).forEach((t) => clearTimeout(t));
      bubbleTimersRef.current = {};
    };
  }, []);

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
      // 입력창·말풍선은 채팅처럼 유지
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
      showBubble(payload.userId, payload.word);
    };
    const onChat = (payload) => {
      if (payload?.userId == null) return;
      showBubble(payload.userId, payload.text || payload.word);
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
    socket.on('hunmin:chat', onChat);
    socket.on('hunmin:match_end', onMatchEnd);
    socket.on('hunmin:rematch_search', onRematchSearch);

    return () => {
      socket.off('hunmin:joined', onJoined);
      socket.off('hunmin:room', onRoom);
      socket.off('hunmin:round_start', onRoundStart);
      socket.off('hunmin:round_end', onRoundEnd);
      socket.off('hunmin:answer_result', onAnswerResult);
      socket.off('hunmin:answer_progress', onAnswerProgress);
      socket.off('hunmin:chat', onChat);
      socket.off('hunmin:match_end', onMatchEnd);
      socket.off('hunmin:rematch_search', onRematchSearch);
    };
  }, [socket, you?.userId, showBubble]);

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

    // 채팅처럼 전송 즉시 비우고 포커스 유지
    setInput('');
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });

    if (!socket) return;

    // 언제든 말풍선 채팅
    if (you?.userId != null) {
      showBubble(you.userId, word);
    }
    socket.emit('hunmin:chat', { text: word });

    // 라운드 중이면 같은 내용으로 선착 정답도 시도
    if (phase === 'playing' && !submitted) {
      socket.emit('hunmin:answer', { word });
    }
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
              <View style={styles.timerSlot}>
                {phase === 'playing' ? (
                  <Text style={styles.timer}>{sec}</Text>
                ) : (
                  <Text style={styles.revealStatus} numberOfLines={2}>
                    {result?.winners?.length
                      ? (result.winners || []).map((w) => w.username).join(', ')
                      : '정답 없음'}
                  </Text>
                )}
              </View>
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
            placeholder="단어 입력"
            placeholderTextColor={colors.textLight20}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
            blurOnSubmit={false}
            onSubmitEditing={onSubmit}
            showSoftInputOnFocus
            {...themedTextInputProps}
          />
          <Pressable style={styles.submitBtn} onPress={onSubmit}>
            <Text style={styles.submitText}>확인</Text>
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
      zIndex: 1,
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
      zIndex: 1,
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
      paddingTop: 0,
      overflow: 'visible',
      zIndex: 1,
    },
    seatCol: {
      width: colW,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: normalize(20),
      overflow: 'visible',
      zIndex: 2,
      paddingTop: 0,
    },
    seatSlot: {
      width: normalize(40),
      position: 'relative',
      alignItems: 'center',
      overflow: 'visible',
      zIndex: 1,
    },
    seatSlotRaised: {
      zIndex: 8,
    },
    seatStack: {
      width: normalize(40),
      alignItems: 'center',
    },
    avatar: {
      width: normalize(18),
      height: normalize(18),
      borderRadius: normalize(9),
      marginBottom: normalize(2),
      borderWidth: 2.5,
      borderColor: 'transparent',
    },
    avatarEmpty: {
      backgroundColor: '#DDD8D0',
      opacity: 0.7,
    },
    seatName: {
      fontFamily: fonts.bold,
      fontSize: normalize(11),
      color: colors.textSecondary,
      maxWidth: normalize(52),
      textAlign: 'center',
    },
    seatScore: {
      fontFamily: fonts.regular,
      fontSize: normalize(10),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    bubbleWrap: {
      position: 'absolute',
      top: normalize(0),
      // 부모 폭 제한으로 조기 줄바꿈되지 않게 여유
      width: normalize(110),
      zIndex: 9,
      alignItems: 'flex-start',
    },
    bubbleWrapLeft: {
      left: normalize(34),
      alignItems: 'flex-start',
    },
    bubbleWrapRight: {
      right: normalize(34),
      alignItems: 'flex-end',
    },
    bubbleBody: {
      backgroundColor: BUBBLE_FILL,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: BUBBLE_BORDER,
      borderRadius: normalize(10),
      paddingHorizontal: normalize(7),
      paddingVertical: normalize(4),
      // 짧은 글은 내용만큼, 길면 한글 약 6자에서 줄바꿈
      maxWidth: normalize(92),
      zIndex: 2,
    },
    bubbleTailBorder: {
      position: 'absolute',
      top: normalize(8),
      width: 0,
      height: 0,
      zIndex: 1,
      borderTopWidth: normalize(6),
      borderBottomWidth: normalize(6),
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    bubbleTailBorderLeft: {
      left: normalize(-6),
      borderRightWidth: normalize(7),
      borderRightColor: BUBBLE_BORDER,
    },
    bubbleTailBorderRight: {
      right: normalize(-6),
      borderLeftWidth: normalize(7),
      borderLeftColor: BUBBLE_BORDER,
    },
    bubbleTailFill: {
      position: 'absolute',
      top: normalize(9),
      width: 0,
      height: 0,
      zIndex: 3,
      borderTopWidth: normalize(5),
      borderBottomWidth: normalize(5),
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    bubbleTailFillLeft: {
      left: normalize(-4),
      borderRightWidth: normalize(6),
      borderRightColor: BUBBLE_FILL,
    },
    bubbleTailFillRight: {
      right: normalize(-4),
      borderLeftWidth: normalize(6),
      borderLeftColor: BUBBLE_FILL,
    },
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: normalize(11),
      lineHeight: normalize(15),
      color: colors.textPrimary,
    },
    centerCol: {
      flex: 1,
      maxWidth: normalize(220),
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(2),
      zIndex: 0,
      overflow: 'visible',
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
    timerSlot: {
      minHeight: normalize(34),
      marginBottom: normalize(6),
      alignSelf: 'center',
      width: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    timer: {
      fontFamily: fonts.bold,
      fontSize: normalize(28),
      color: '#8B7355',
      textAlign: 'center',
    },
    revealStatus: {
      fontFamily: fonts.bold,
      fontSize: normalize(18),
      color: '#8B7355',
      textAlign: 'center',
      paddingHorizontal: normalize(4),
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
      borderRadius: normalize(12),
      backgroundColor: '#EDE6DC',
      borderWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    choChar: {
      fontFamily: fonts.bold,
      fontSize: normalize(20),
      color: '#5C5346',
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
    inputRow: {
      flexDirection: 'row',
      gap: normalize(8),
      marginTop: normalize(10),
      marginBottom: normalize(4),
      zIndex: 50,
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
