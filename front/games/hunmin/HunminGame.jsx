/**
 * 훈민정음 멀티플레이 — 최대 6인 / 라운드 10초 / 선착 정답 +1 · 20점 선취
 * 비주얼: 말풍선 카니발 (파스텔 · Jua · 플랫 보더)
 * 키보드: 입력창만 상승, 상단 아레나 고정
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
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Jua_400Regular } from '@expo-google-fonts/jua';
import { fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import AppPopupModal from '../../components/common/AppPopupModal';

const ROUND_MS = 10000;
const WIN_SCORE = 20;
const SEAT_COUNT = 6;
const TIMER_DOTS = 7;
/** 말풍선 표시 후 자동 숨김 */
const BUBBLE_TTL_MS = 3000;

const CARNIVAL = {
  bgTop: '#FFF6EE',
  bgBottom: '#FFEFDD',
  card: '#FFFFFF',
  border: '#FFD9B0',
  borderSpeak: '#FF8FA3',
  avatar: '#FFE1B8',
  point: '#FF8FA3',
  ink: '#5A4632',
  muted: '#C99A6C',
  dotOff: '#FFD9B0',
};

const SEAT_EMOJIS = ['🙋', '😎', '🐣', '🐯', '🐼', '🦊'];

function SpeechBubble({ text, side, styles }) {
  if (!text) return null;
  const isLeft = side === 'left';
  return (
    <Animated.View
      entering={ZoomIn.duration(150)}
      exiting={FadeOut.duration(120)}
      pointerEvents="none"
      style={[
        styles.bubbleWrap,
        isLeft ? styles.bubbleWrapLeft : styles.bubbleWrapRight,
      ]}
    >
      <View
        style={[
          styles.bubbleBody,
          isLeft ? styles.bubbleBodyLeft : styles.bubbleBodyRight,
        ]}
      >
        <Text style={styles.bubbleText} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </Animated.View>
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
  gameFont,
}) {
  const speaking = Boolean(bubble) || isRoundWinner;
  const emoji = SEAT_EMOJIS[seatIndex % SEAT_EMOJIS.length];
  const isRight = side === 'right';
  const avatar = (
    <View style={[styles.avatar, !player && styles.avatarEmpty]}>
      {player ? <Text style={styles.avatarEmoji}>{emoji}</Text> : null}
    </View>
  );
  const meta = (
    <View style={[styles.playerMeta, isRight && styles.playerMetaRight]}>
      <Text
        style={[
          styles.seatName,
          gameFont,
          !player && styles.seatNameEmpty,
          isRight && styles.seatNameRight,
        ]}
        numberOfLines={1}
      >
        {player ? (isYou ? '나' : player.username || '플레이어') : '빈자리'}
      </Text>
      <Text style={[styles.seatScore, gameFont, isRight && styles.seatScoreRight]}>
        {player ? `${Number(player.score) || 0}점` : '—'}
      </Text>
    </View>
  );
  return (
    <View style={[styles.seatSlot, bubble ? styles.seatSlotRaised : null]}>
      {isRight ? <SpeechBubble text={bubble} side={side} styles={styles} /> : null}
      <View
        style={[
          styles.playerCard,
          speaking && styles.playerCardSpeak,
          !player && styles.playerCardEmpty,
        ]}
      >
        {isRight ? (
          <>
            {meta}
            {avatar}
          </>
        ) : (
          <>
            {avatar}
            {meta}
          </>
        )}
      </View>
      {!isRight ? <SpeechBubble text={bubble} side={side} styles={styles} /> : null}
    </View>
  );
}

function TimerDots({ remainMs, styles, gameFont }) {
  const onCount = Math.max(
    0,
    Math.min(TIMER_DOTS, Math.ceil((remainMs / ROUND_MS) * TIMER_DOTS)),
  );
  const sec = Math.max(0, Math.ceil(remainMs / 1000));
  return (
    <View style={styles.timerRow}>
      <View style={styles.dotsRow}>
        {Array.from({ length: TIMER_DOTS }, (_, i) => (
          <View
            key={`dot-${i}`}
            style={[
              styles.timerDot,
              {
                backgroundColor:
                  i < onCount ? CARNIVAL.point : CARNIVAL.dotOff,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.timerLabel, gameFont]}>{sec}초 남음</Text>
    </View>
  );
}

export default function HunminGame() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const [fontsLoaded] = useFonts({ Jua_400Regular });
  const gameFont = fontsLoaded
    ? { fontFamily: 'Jua_400Regular' }
    : { fontFamily: fonts.regular };
  const { socket } = useSocket();
  const inputRef = useRef(null);

  const [phase, setPhase] = useState('connecting');
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [round, setRound] = useState(null);
  const [result, setResult] = useState(null);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [remainMs, setRemainMs] = useState(ROUND_MS);
  const [username, setUsername] = useState('');
  const [bubbles, setBubbles] = useState({});
  const [matchEnd, setMatchEnd] = useState(null);
  const [rematchSearching, setRematchSearching] = useState(false);
  const matchedRef = useRef(false);
  const phaseRef = useRef(phase);
  const inMatchRef = useRef(false);
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

  const youIdRef = useRef(null);
  youIdRef.current = you?.userId ?? null;

  const rematch = useCallback(() => {
    if (!socket) return;
    matchedRef.current = false;
    inMatchRef.current = false;
    setRematchSearching(false);
    setMatchEnd(null);
    setPhase('connecting');
    setRoom(null);
    setYou(null);
    setRound(null);
    setResult(null);
    setBubbles({});
    setSubmitted(false);
    const name =
      username ||
      `학생${String(socket.id || '').slice(-4) || Math.floor(Math.random() * 1000)}`;
    socket.emit('hunmin:leave');
    socket.emit('hunmin:match', { username: name });
  }, [socket, username]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const u = res.data?.data?.username || res.data?.username || '';
        if (!cancelled) setUsername(String(u || '').trim());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const name =
      username ||
      `학생${String(socket.id || '').slice(-4) || Math.floor(Math.random() * 1000)}`;

    const applyRoom = (payload, { setYouFromJoined } = {}) => {
      if (!payload) return;
      setRoom(payload);
      if (setYouFromJoined?.userId != null) {
        setYou(setYouFromJoined);
      }
      const status = payload.status || payload.phase;
      if (!matchedRef.current) {
        matchedRef.current = true;
        setPhase((prev) => (prev === 'connecting' ? 'lobby' : prev));
      }
      if (status === 'playing' && !inMatchRef.current) {
        setPhase('waiting');
      } else if (status === 'lobby' && !inMatchRef.current) {
        setPhase((prev) =>
          prev === 'connecting' || prev === 'waiting' || prev === 'match_end'
            ? 'lobby'
            : prev,
        );
      } else if (status === 'reveal' && inMatchRef.current) {
        setPhase((prev) => (prev === 'playing' ? 'reveal' : prev));
      }
    };

    const onJoined = (payload) => {
      const joinedYou = payload?.you || null;
      if (joinedYou) setYou(joinedYou);
      applyRoom(payload?.room, { setYouFromJoined: joinedYou });
      if (payload?.mode === 'waiting') {
        setPhase('waiting');
      } else if (!inMatchRef.current) {
        setPhase('lobby');
      }
      matchedRef.current = true;
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };

    const onRoom = (payload) => {
      applyRoom(payload);
    };

    const onRoundStart = (payload) => {
      inMatchRef.current = true;
      setRematchSearching(false);
      setMatchEnd(null);
      const nextRound = payload?.round || payload;
      setRound(nextRound);
      setResult(null);
      setSubmitted(false);
      setRemainMs(
        Math.max(
          0,
          (nextRound?.endsAt || Date.now() + ROUND_MS) - Date.now(),
        ),
      );
      setPhase('playing');
      setRoom((prev) =>
        prev
          ? {
              ...prev,
              status: 'playing',
              players: payload?.players || prev.players,
            }
          : prev,
      );
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };

    const onRoundEnd = (payload) => {
      const nextResult = payload?.result || payload;
      setResult(nextResult);
      setPhase('reveal');
      if (payload?.room) {
        applyRoom(payload.room);
      } else if (payload?.players) {
        setRoom((prev) =>
          prev
            ? { ...prev, players: payload.players, status: 'reveal' }
            : prev,
        );
      }
      const correct = nextResult?.correct || [];
      if (correct.length) {
        correct.forEach((w) => {
          if (w?.userId != null && w?.word) showBubble(w.userId, w.word);
        });
      } else {
        const winners = nextResult?.winners || [];
        winners.forEach((w) => {
          if (w?.userId != null && w?.word) showBubble(w.userId, w.word);
        });
      }
      requestAnimationFrame(() => {
        inputRef.current?.focus?.();
      });
    };

    const onAnswerResult = (payload) => {
      if (payload?.ok) {
        setSubmitted(true);
      }
    };

    const onAnswerProgress = (payload) => {
      if (payload?.ok && payload?.userId != null && payload?.word) {
        showBubble(payload.userId, payload.word);
      } else if (
        payload?.userId != null &&
        payload?.word &&
        payload.userId !== youIdRef.current
      ) {
        showBubble(payload.userId, payload.word);
      }
    };

    const onChat = (payload) => {
      if (payload?.userId == null) return;
      if (
        youIdRef.current != null &&
        payload.userId === youIdRef.current
      ) {
        return;
      }
      showBubble(payload.userId, payload.text);
    };

    const onMatchEnd = (payload) => {
      setMatchEnd(payload);
      setRematchSearching(true);
      setPhase('match_end');
      setRound(null);
      setResult(null);
      if (payload?.room) {
        applyRoom(payload.room);
      } else if (payload?.players) {
        setRoom((prev) =>
          prev
            ? { ...prev, players: payload.players, status: 'lobby' }
            : prev,
        );
      }
    };

    const onRematchSearch = (payload) => {
      setRematchSearching(true);
      setMatchEnd(null);
      inMatchRef.current = false;
      setPhase('lobby');
      setRound(null);
      setResult(null);
      if (payload?.room) applyRoom(payload.room);
    };

    socket.emit('hunmin:match', { username: name });
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
      socket.emit('hunmin:leave');
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
  }, [socket, username, showBubble]);

  useEffect(() => {
    if (phase !== 'playing' || !round?.endsAt) return undefined;
    const tick = setInterval(() => {
      setRemainMs(Math.max(0, round.endsAt - Date.now()));
    }, 200);
    return () => clearInterval(tick);
  }, [phase, round?.endsAt]);

  useEffect(() => {
    if (phase === 'connecting' || phase === 'match_end') return undefined;
    const t = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 280);
    return () => clearTimeout(t);
  }, [phase]);

  const onSubmit = () => {
    const word = input.trim();
    if (!word) return;

    setInput('');
    requestAnimationFrame(() => {
      inputRef.current?.focus?.();
    });

    if (!socket) return;

    if (you?.userId != null) {
      showBubble(you.userId, word);
    }
    socket.emit('hunmin:chat', { text: word });

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

  const roundLabel =
    phase === 'playing'
      ? '진행 중'
      : phase === 'reveal'
        ? '정답 공개'
        : phase === 'lobby'
          ? '대기 중'
          : phase === 'waiting'
            ? '입장 대기'
            : '매칭';

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
            gameFont={gameFont}
          />
        );
      })}
    </View>
  );

  return (
    <LinearGradient
      colors={[CARNIVAL.bgTop, CARNIVAL.bgBottom]}
      style={styles.root}
    >
      <View style={styles.frame}>
        <View style={styles.guideBox}>
          <Text style={[styles.guideLine, gameFont]}>
            초성에 맞는 단어를 가장 먼저 맞추면 +1점
          </Text>
          <Text style={[styles.guideLine, gameFont]}>
            {winScore}점을 먼저 얻는 사람이 승리합니다
          </Text>
        </View>

        <View style={styles.roomMeta}>
          <Text style={[styles.roomMetaText, gameFont]}>
            방 {room?.roomId || '—'} · {players.length}/{SEAT_COUNT}
            {waiting.length > 0 ? ` · 대기 ${waiting.length}` : ''}
          </Text>
          <Pressable onPress={rematch} hitSlop={8}>
            <Text style={[styles.rematch, gameFont]}>다시 매칭</Text>
          </Pressable>
        </View>

        <View style={styles.arena}>
          {renderSeatCol(leftSeats, 'left', 0)}

          <View style={styles.centerCol}>
            <View style={styles.roundPill}>
              <Text style={[styles.roundPillText, gameFont]}>{roundLabel}</Text>
            </View>

            {phase === 'connecting' && (
              <View style={styles.centerBox}>
                <ActivityIndicator color={CARNIVAL.point} />
                <Text style={[styles.centerText, gameFont]}>방 찾는 중…</Text>
              </View>
            )}
            {phase === 'waiting' && (
              <View style={styles.centerBox}>
                <Text style={[styles.centerTitle, gameFont]}>라운드 진행 중</Text>
                <Text style={[styles.centerText, gameFont]}>끝나면 자동 입장</Text>
              </View>
            )}
            {showLobbyOnly && (
              <View style={styles.centerBox}>
                <Text style={[styles.centerText, gameFont]}>
                  2명 이상이면 시작해요
                </Text>
                <Text style={[styles.centerHint, gameFont]}>
                  채팅으로 인사해 보세요
                </Text>
              </View>
            )}
            {rematchSearching && phase === 'lobby' && (
              <View style={styles.centerBox}>
                <Text style={[styles.centerTitle, gameFont]}>재매칭</Text>
                <Text style={[styles.centerText, gameFont]}>
                  방을 새로 찾는 중…
                </Text>
              </View>
            )}
            {showGameCenter && (
              <View style={styles.centerPlay}>
                <View style={styles.choBox}>
                  <Text
                    style={[styles.choText, gameFont]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {choseong.length > 0 ? choseong.join(' ') : '···'}
                  </Text>
                </View>
                {phase === 'playing' ? (
                  <TimerDots
                    remainMs={remainMs}
                    styles={styles}
                    gameFont={gameFont}
                  />
                ) : (
                  <Text
                    style={[styles.revealStatus, gameFont]}
                    numberOfLines={2}
                  >
                    {result?.winners?.length
                      ? (result.winners || []).map((w) => w.username).join(', ')
                      : '정답 없음'}
                  </Text>
                )}
              </View>
            )}
            {phase === 'match_end' && (
              <View style={styles.centerBox}>
                <Text style={[styles.centerTitle, gameFont]}>경기 종료</Text>
                <Text style={[styles.centerText, gameFont]}>
                  방을 새로 찾는 중…
                </Text>
              </View>
            )}
          </View>

          {renderSeatCol(rightSeats, 'right', 3)}
        </View>

        {phase !== 'connecting' && phase !== 'match_end' ? (
          <Animated.View
            style={[
              styles.chatDock,
              {
                bottom: Math.max(insets.bottom, normalize(4)),
              },
              inputAnimStyle,
            ]}
          >
            <View style={styles.chatBar}>
              <TextInput
                ref={inputRef}
                style={[styles.input, gameFont]}
                value={input}
                onChangeText={setInput}
                editable
                placeholder={
                  phase === 'playing' ? '정답 · 채팅 입력' : '채팅 입력'
                }
                placeholderTextColor={CARNIVAL.muted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={onSubmit}
                showSoftInputOnFocus
                selectionColor={CARNIVAL.point}
                cursorColor={CARNIVAL.point}
              />
              <Pressable
                style={[styles.submitBtn, !input.trim() && styles.submitBtnIdle]}
                onPress={onSubmit}
                hitSlop={6}
              >
                <Text style={[styles.submitText, gameFont]}>보내기</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>

      <AppPopupModal
        visible={Boolean(matchEnd) && rematchSearching}
        onClose={() => {}}
        dismissOnBackdrop={false}
        dismissOnBackPress={false}
      >
        <Text style={[styles.popupTitle, gameFont]}>경기 종료</Text>
        <Text style={[styles.popupBody, gameFont]}>
          {matchWinnerNames
            ? `${matchWinnerNames} 님이 ${winScore}점으로 승리했습니다!`
            : `${winScore}점 선취 경기가 끝났습니다.`}
        </Text>
        <Text style={[styles.popupSearching, gameFont]}>방을 새로 찾는 중…</Text>
      </AppPopupModal>
    </LinearGradient>
  );
}

function createStyles(normalize) {
  const colW = normalize(102);
  return StyleSheet.create({
    root: { flex: 1 },
    frame: {
      flex: 1,
      borderRadius: normalize(22),
      padding: normalize(12),
      overflow: 'visible',
    },
    guideBox: {
      marginBottom: normalize(6),
      paddingHorizontal: normalize(4),
      zIndex: 1,
    },
    guideLine: {
      fontSize: normalize(12),
      color: CARNIVAL.muted,
      textAlign: 'center',
      lineHeight: normalize(16),
    },
    roomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(8),
      zIndex: 1,
    },
    roomMetaText: {
      fontSize: normalize(fontSizes.sm),
      color: CARNIVAL.muted,
    },
    rematch: {
      fontSize: normalize(fontSizes.sm),
      color: CARNIVAL.point,
    },
    arena: {
      flex: 1,
      flexShrink: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
      minHeight: normalize(160),
      overflow: 'visible',
      zIndex: 1,
      gap: normalize(4),
      paddingTop: normalize(4),
      paddingBottom: normalize(56),
    },
    seatCol: {
      width: colW,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: normalize(10),
      overflow: 'visible',
      zIndex: 2,
    },
    seatSlot: {
      width: colW,
      position: 'relative',
      alignItems: 'stretch',
      overflow: 'visible',
      zIndex: 1,
    },
    seatSlotRaised: {
      zIndex: 8,
    },
    playerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: CARNIVAL.card,
      borderWidth: 2,
      borderColor: CARNIVAL.border,
      borderRadius: normalize(16),
      paddingVertical: normalize(8),
      paddingHorizontal: normalize(8),
      gap: normalize(6),
    },
    playerCardSpeak: {
      borderColor: CARNIVAL.borderSpeak,
    },
    playerCardEmpty: {
      opacity: 0.72,
    },
    avatar: {
      width: normalize(32),
      height: normalize(32),
      borderRadius: normalize(16),
      backgroundColor: CARNIVAL.avatar,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEmpty: {
      backgroundColor: CARNIVAL.dotOff,
    },
    avatarEmoji: {
      fontSize: normalize(16),
    },
    playerMeta: {
      flex: 1,
      minWidth: 0,
    },
    playerMetaRight: {
      alignItems: 'flex-end',
    },
    seatName: {
      fontSize: normalize(12),
      color: CARNIVAL.ink,
    },
    seatNameEmpty: {
      color: CARNIVAL.muted,
    },
    seatNameRight: {
      textAlign: 'right',
    },
    seatScore: {
      marginTop: normalize(2),
      fontSize: normalize(11),
      color: CARNIVAL.point,
    },
    seatScoreRight: {
      textAlign: 'right',
    },
    bubbleWrap: {
      position: 'absolute',
      top: normalize(-14),
      zIndex: 9,
      maxWidth: normalize(96),
    },
    bubbleWrapLeft: {
      left: normalize(40),
    },
    bubbleWrapRight: {
      right: normalize(40),
    },
    bubbleBody: {
      backgroundColor: CARNIVAL.point,
      paddingHorizontal: normalize(12),
      paddingVertical: normalize(6),
    },
    bubbleBodyLeft: {
      borderTopLeftRadius: normalize(14),
      borderTopRightRadius: normalize(14),
      borderBottomRightRadius: normalize(14),
      borderBottomLeftRadius: normalize(3),
    },
    bubbleBodyRight: {
      borderTopLeftRadius: normalize(14),
      borderTopRightRadius: normalize(14),
      borderBottomLeftRadius: normalize(14),
      borderBottomRightRadius: normalize(3),
    },
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: normalize(11.5),
      lineHeight: normalize(15),
      color: '#FFFFFF',
    },
    centerCol: {
      flex: 1,
      maxWidth: normalize(210),
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: normalize(4),
      paddingTop: normalize(2),
      zIndex: 0,
      overflow: 'visible',
      gap: normalize(10),
    },
    roundPill: {
      backgroundColor: CARNIVAL.avatar,
      borderRadius: normalize(12),
      paddingVertical: normalize(3),
      paddingHorizontal: normalize(12),
    },
    roundPillText: {
      fontSize: normalize(12),
      color: CARNIVAL.muted,
    },
    centerPlay: {
      width: '100%',
      alignItems: 'center',
      gap: normalize(12),
    },
    centerBox: {
      alignItems: 'center',
      gap: normalize(8),
    },
    centerTitle: {
      fontSize: normalize(fontSizes.xxl),
      color: CARNIVAL.ink,
      textAlign: 'center',
    },
    centerText: {
      fontSize: normalize(fontSizes.md),
      color: CARNIVAL.muted,
      textAlign: 'center',
      lineHeight: normalize(18),
    },
    centerHint: {
      fontSize: normalize(fontSizes.sm),
      color: CARNIVAL.point,
      textAlign: 'center',
    },
    timerRow: {
      alignItems: 'center',
      gap: normalize(6),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(4),
    },
    timerDot: {
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
    },
    timerLabel: {
      fontSize: normalize(13),
      color: CARNIVAL.muted,
    },
    revealStatus: {
      fontSize: normalize(14),
      color: CARNIVAL.point,
      textAlign: 'center',
      minHeight: normalize(28),
      paddingHorizontal: normalize(4),
    },
    choBox: {
      backgroundColor: CARNIVAL.card,
      borderWidth: 3,
      borderColor: CARNIVAL.border,
      borderRadius: normalize(20),
      paddingVertical: normalize(6),
      paddingHorizontal: normalize(22),
      minWidth: normalize(120),
      alignItems: 'center',
      justifyContent: 'center',
    },
    choText: {
      fontSize: normalize(36),
      letterSpacing: normalize(4),
      color: CARNIVAL.ink,
      textAlign: 'center',
    },
    chatDock: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexShrink: 0,
      zIndex: 50,
    },
    chatBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(8),
      backgroundColor: CARNIVAL.card,
      borderWidth: 2,
      borderColor: CARNIVAL.border,
      borderRadius: normalize(22),
      paddingVertical: normalize(6),
      paddingLeft: normalize(14),
      paddingRight: normalize(6),
    },
    input: {
      flex: 1,
      minHeight: normalize(40),
      paddingVertical: normalize(8),
      paddingHorizontal: 0,
      fontSize: normalize(fontSizes.lg),
      color: CARNIVAL.ink,
    },
    submitBtn: {
      height: normalize(40),
      paddingHorizontal: normalize(14),
      borderRadius: normalize(16),
      backgroundColor: CARNIVAL.point,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnIdle: {
      backgroundColor: CARNIVAL.dotOff,
    },
    submitText: {
      fontSize: normalize(fontSizes.md),
      color: '#FFFFFF',
    },
    popupTitle: {
      fontSize: normalize(18),
      color: CARNIVAL.ink,
      textAlign: 'center',
      marginBottom: normalize(10),
    },
    popupBody: {
      fontSize: normalize(14),
      color: CARNIVAL.muted,
      textAlign: 'center',
      lineHeight: normalize(22),
      marginBottom: normalize(12),
    },
    popupSearching: {
      fontSize: normalize(14),
      color: CARNIVAL.point,
      textAlign: 'center',
    },
  });
}
