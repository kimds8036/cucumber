/**
 * 훈민정음 멀티플레이 — 최대 4인 / 라운드 5초
 * 정답자 중 가장 늦은 사람 + 미제출 → 패배
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { themedTextInputProps } from '../../styles/mypage.style';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import { wordToChoseong } from './choUtils';

const ROUND_MS = 5000;

export default function HunminGame() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const { socket } = useSocket();

  const [phase, setPhase] = useState('connecting'); // connecting|lobby|waiting|playing|reveal
  const [room, setRoom] = useState(null);
  const [you, setYou] = useState(null);
  const [round, setRound] = useState(null);
  const [result, setResult] = useState(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [remainMs, setRemainMs] = useState(ROUND_MS);
  const [username, setUsername] = useState('');
  const matchedRef = useRef(false);

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
    setTimeout(() => {
      matchedRef.current = true;
      setPhase('connecting');
      setResult(null);
      setRound(null);
      setSubmitted(false);
      setInput('');
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
      setPhase(payload.mode === 'waiting' ? 'waiting' : payload.room?.status || 'lobby');
      if (payload.message) {
        setFeedback({ type: 'info', text: payload.message });
      }
    };
    const onRoom = (payload) => {
      setRoom(payload);
      const uid = you?.userId;
      const inWaiting = payload.waiting?.some((p) => p.userId === uid);
      if (inWaiting) {
        setPhase('waiting');
        return;
      }
      if (payload.status === 'lobby') setPhase('lobby');
      if (payload.status === 'playing') setPhase('playing');
      if (payload.status === 'reveal') setPhase('reveal');
    };
    const onRoundStart = (payload) => {
      setRound(payload.round);
      setResult(null);
      setSubmitted(false);
      setInput('');
      setFeedback({ type: 'info', text: '초성에 맞는 단어를 입력하세요!' });
      setPhase('playing');
      setRemainMs(
        Math.max(0, (payload.round?.endsAt || Date.now() + ROUND_MS) - Date.now()),
      );
    };
    const onRoundEnd = (payload) => {
      setResult(payload.result);
      setRoom(payload.room);
      setPhase('reveal');
      setRound(null);
    };
    const onAnswerResult = (payload) => {
      setFeedback({
        type: payload.ok ? 'ok' : 'err',
        text: payload.message || (payload.ok ? '제출 완료' : '실패'),
      });
      if (payload.ok) setSubmitted(true);
    };

    socket.on('hunmin:joined', onJoined);
    socket.on('hunmin:room', onRoom);
    socket.on('hunmin:round_start', onRoundStart);
    socket.on('hunmin:round_end', onRoundEnd);
    socket.on('hunmin:answer_result', onAnswerResult);

    return () => {
      socket.off('hunmin:joined', onJoined);
      socket.off('hunmin:room', onRoom);
      socket.off('hunmin:round_start', onRoundStart);
      socket.off('hunmin:round_end', onRoundEnd);
      socket.off('hunmin:answer_result', onAnswerResult);
    };
  }, [socket, you?.userId]);

  useEffect(() => {
    if (phase !== 'playing' || !round?.endsAt) return undefined;
    const tick = setInterval(() => {
      setRemainMs(Math.max(0, round.endsAt - Date.now()));
    }, 50);
    return () => clearInterval(tick);
  }, [phase, round?.endsAt]);

  const onSubmit = () => {
    if (!socket || submitted || phase !== 'playing') return;
    const word = input.trim();
    if (!word) {
      setFeedback({ type: 'err', text: '단어를 입력해 주세요.' });
      return;
    }
    const need = round?.choseong?.length || 2;
    const got = wordToChoseong(word);
    if (!got || got.length < need) {
      setFeedback({
        type: 'err',
        text: `${need}글자 이상 한글 단어를 입력해 주세요.`,
      });
      return;
    }
    socket.emit('hunmin:answer', { word });
  };

  const choseong = round?.choseong || [];
  const players = room?.players || [];
  const waiting = room?.waiting || [];
  const sec = (remainMs / 1000).toFixed(1);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomMeta}>
          <Text style={styles.roomMetaText}>
            방 {room?.roomId || '—'} · {players.length}/4
            {waiting.length > 0 ? ` · 대기 ${waiting.length}` : ''}
          </Text>
          <Pressable onPress={rematch} hitSlop={8}>
            <Text style={styles.rematch}>다시 매칭</Text>
          </Pressable>
        </View>

        <View style={styles.playersRow}>
          {Array.from({ length: 4 }).map((_, i) => {
            const p = players[i];
            const isYou = p && you && p.userId === you.userId;
            return (
              <View
                key={`seat-${i}`}
                style={[styles.seat, isYou && styles.seatYou, !p && styles.seatEmpty]}
              >
                <Text style={styles.seatText} numberOfLines={1}>
                  {p ? (isYou ? '나' : p.username || `P${i + 1}`) : '빈자리'}
                </Text>
              </View>
            );
          })}
        </View>

        {phase === 'connecting' && (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primaryDark} />
            <Text style={styles.centerText}>방 찾는 중…</Text>
          </View>
        )}

        {phase === 'waiting' && (
          <View style={styles.centerBox}>
            <Text style={styles.centerTitle}>라운드 진행 중</Text>
            <Text style={styles.centerText}>
              이 라운드가 끝나면 자동으로 입장해요.
            </Text>
          </View>
        )}

        {phase === 'lobby' && (
          <View style={styles.centerBox}>
            <Text style={styles.centerTitle}>대기실</Text>
            <Text style={styles.centerText}>
              2명 이상이면 곧 시작 · 방 정원 4명
            </Text>
          </View>
        )}

        {phase === 'playing' && (
          <>
            <Text style={styles.timer}>{sec}s</Text>
            <Text style={styles.prompt}>
              초성 {choseong.length}칸에 맞는 단어를 입력하세요
            </Text>
            <View style={styles.choRow}>
              {choseong.map((c, idx) => (
                <View key={`${c}-${idx}`} style={styles.choTile}>
                  <Text style={styles.choChar}>{c}</Text>
                </View>
              ))}
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                editable={!submitted}
                placeholder="단어 입력"
                placeholderTextColor={colors.textLight20}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                {...themedTextInputProps}
              />
              <Pressable
                style={[
                  styles.submitBtn,
                  submitted && styles.submitDisabled,
                ]}
                onPress={onSubmit}
                disabled={submitted}
              >
                <Text style={styles.submitText}>
                  {submitted ? '제출됨' : '확인'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {phase === 'reveal' && result && (
          <View style={styles.centerBox}>
            <Text style={styles.centerTitle}>라운드 결과</Text>
            <Text style={styles.choResult}>
              {result.choseong?.join(' · ')}
            </Text>
            <Text style={styles.resultLine}>
              승: {(result.winners || []).map((w) => w.username).join(', ') || '없음'}
            </Text>
            <Text style={[styles.resultLine, styles.loseLine]}>
              패: {(result.losers || []).map((w) => w.username).join(', ') || '없음'}
            </Text>
            <Text style={styles.centerText}>곧 다음 라운드가 시작됩니다</Text>
          </View>
        )}

        {feedback ? (
          <Text
            style={[
              styles.feedback,
              feedback.type === 'ok' && styles.feedbackOk,
              feedback.type === 'err' && styles.feedbackErr,
            ]}
          >
            {feedback.text}
          </Text>
        ) : null}

        <Text style={styles.rule}>
          5초 안에 맞추세요. 가장 늦게 맞춘 사람과 못 맞춘 사람은 패배예요.
          방이 가득 차면 다른 방으로 매칭됩니다.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    root: { flex: 1 },
    scroll: { paddingBottom: normalize(20) },
    roomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: normalize(10),
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
    playersRow: {
      flexDirection: 'row',
      gap: normalize(6),
      marginBottom: normalize(14),
    },
    seat: {
      flex: 1,
      paddingVertical: normalize(8),
      borderRadius: normalize(10),
      backgroundColor: '#FFF4E8',
      alignItems: 'center',
    },
    seatYou: {
      borderWidth: 1.5,
      borderColor: '#C45C26',
    },
    seatEmpty: {
      backgroundColor: colors.textLight5,
    },
    seatText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.textPrimary,
    },
    centerBox: {
      alignItems: 'center',
      paddingVertical: normalize(28),
      gap: normalize(8),
    },
    centerTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.xxl),
      color: colors.textPrimary,
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
      fontSize: normalize(36),
      color: '#C45C26',
      textAlign: 'center',
      marginBottom: normalize(6),
    },
    prompt: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: normalize(12),
    },
    choRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: normalize(10),
      marginBottom: normalize(16),
    },
    choTile: {
      width: normalize(72),
      height: normalize(72),
      borderRadius: normalize(16),
      backgroundColor: '#FFF4E8',
      borderWidth: 1.5,
      borderColor: '#E8A06A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    choChar: {
      fontFamily: fonts.bold,
      fontSize: normalize(34),
      color: '#C45C26',
    },
    choResult: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.title),
      color: '#C45C26',
      marginBottom: normalize(8),
    },
    inputRow: {
      flexDirection: 'row',
      gap: normalize(8),
      marginBottom: normalize(10),
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
    resultLine: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.primaryDark,
      textAlign: 'center',
    },
    loseLine: { color: '#C45C26' },
    feedback: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: normalize(8),
    },
    feedbackOk: { color: colors.primaryDark },
    feedbackErr: { color: '#C45C26' },
    rule: {
      marginTop: normalize(16),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.textLight40,
      textAlign: 'center',
      lineHeight: normalize(16),
    },
  });
}
