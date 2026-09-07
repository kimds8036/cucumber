/**
 * 훈민정음 멀티플레이 — 최대 6인 / 라운드 10초 / 20점 선취
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
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';
import { themedTextInputProps } from '../../styles/mypage.style';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../utils/api';
import AppPopupModal from '../../components/common/AppPopupModal';
import { wordToChoseong } from './choUtils';

const ROUND_MS = 10000;
const WIN_SCORE = 20;
const SEAT_COUNT = 6;

/** 슬롯별 구분색 — 앱 초록 제외, 서로 잘 구분되는 톤 */
const PLAYER_PALETTE = [
  { accent: '#C45C26', soft: '#FFF1E8', ink: '#8B3A12' }, // 테라코타
  { accent: '#4F7CAC', soft: '#EAF1F8', ink: '#2A4A6E' }, // 스틸 블루
  { accent: '#A67C52', soft: '#F6EFE7', ink: '#5C4028' }, // 웜 브라운
  { accent: '#8B6FA8', soft: '#F2ECF7', ink: '#4A3560' }, // 더스티 퍼플
  { accent: '#C4893A', soft: '#FBF3E6', ink: '#6E4A18' }, // 앰버
  { accent: '#B06B76', soft: '#F7EBED', ink: '#6A353C' }, // 더스티 로즈
];

const EMPTY_PALETTE = {
  accent: '#C8C2BA',
  soft: '#F3F1EE',
  ink: colors.textSecondary,
};

function paletteForSeat(seatIndex) {
  return PLAYER_PALETTE[seatIndex % PLAYER_PALETTE.length] || EMPTY_PALETTE;
}

function PlayerSeat({
  player,
  isYou,
  bubble,
  side,
  seatIndex,
  styles,
}) {
  const palette = player ? paletteForSeat(seatIndex) : EMPTY_PALETTE;
  return (
    <View style={[styles.seat, side === 'left' ? styles.seatLeft : styles.seatRight]}>
      {side === 'right' && bubble ? (
        <View
          style={[
            styles.bubble,
            styles.bubbleRight,
            { borderColor: palette.accent, backgroundColor: palette.soft },
          ]}
        >
          <Text style={[styles.bubbleText, { color: palette.ink }]} numberOfLines={2}>
            {bubble}
          </Text>
        </View>
      ) : null}
      <View
        style={[
          styles.seatCard,
          { backgroundColor: palette.soft, borderColor: palette.accent },
          player ? styles.seatFilled : styles.seatEmpty,
          isYou && styles.seatYou,
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
        <Text style={[styles.seatName, player && { color: palette.ink }]} numberOfLines={1}>
          {player ? (isYou ? '나' : player.username || '플레이어') : '빈자리'}
        </Text>
        <Text style={[styles.seatScore, player && { color: palette.accent }]}>
          {player ? `${Number(player.score) || 0}점` : '—'}
        </Text>
      </View>
      {side === 'left' && bubble ? (
        <View
          style={[
            styles.bubble,
            styles.bubbleLeft,
            { borderColor: palette.accent, backgroundColor: palette.soft },
          ]}
        >
          <Text style={[styles.bubbleText, { color: palette.ink }]} numberOfLines={2}>
            {bubble}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function HunminGame() {
  const { width } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(width), [width]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);
  const { socket } = useSocket();

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
      setPhase(
        payload.mode === 'waiting'
          ? 'waiting'
          : payload.room?.status || 'lobby',
      );
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
      if (payload.status === 'lobby') setPhase('lobby');
      if (payload.status === 'playing') setPhase('playing');
      if (payload.status === 'reveal') setPhase('reveal');
    };
    const onRoundStart = (payload) => {
      setRound(payload.round);
      setResult(null);
      setSubmitted(false);
      setInput('');
      setBubbles({});
      setMatchEnd(null);
      setRematchSearching(false);
      setFeedback({ type: 'info', text: '초성에 맞는 단어를 입력하세요!' });
      setPhase('playing');
      setRemainMs(
        Math.max(
          0,
          (payload.round?.endsAt || Date.now() + ROUND_MS) - Date.now(),
        ),
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
      if (payload.word != null) {
        setSubmitted(true);
      }
    };
    const onAnswerProgress = (payload) => {
      if (payload?.userId == null) return;
      setBubbles((prev) => ({
        ...prev,
        [payload.userId]: String(payload.word || ''),
      }));
    };
    const onMatchEnd = (payload) => {
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
    setSubmitted(true);
  };

  const choseong = round?.choseong || result?.choseong || [];
  const players = room?.players || [];
  const waiting = room?.waiting || [];
  const seats = Array.from({ length: SEAT_COUNT }, (_, i) => players[i] || null);
  const leftSeats = seats.slice(0, 3);
  const rightSeats = seats.slice(3, 6);
  const sec = (remainMs / 1000).toFixed(1);
  const winScore = room?.winScore || WIN_SCORE;

  const matchWinnerNames = (matchEnd?.winners || [])
    .map((w) => w.username)
    .join(', ');

  const renderSeatCol = (list, side, indexOffset) => (
    <View style={styles.seatCol}>
      {list.map((p, i) => {
        const seatIndex = indexOffset + i;
        const isYou = p && you && p.userId === you.userId;
        const bubble = p ? bubbles[p.userId] : null;
        return (
          <PlayerSeat
            key={`${side}-${i}`}
            player={p}
            isYou={Boolean(isYou)}
            bubble={bubble}
            side={side}
            seatIndex={seatIndex}
            styles={styles}
          />
        );
      })}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.guideBox}>
        <Text style={styles.guideLine}>
          초성에 맞는 한글 단어를 {Math.round(ROUND_MS / 1000)}초 안에 입력하세요
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

      <View style={styles.arena}>
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
          {phase === 'lobby' && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>대기실</Text>
              <Text style={styles.centerText}>
                {rematchSearching
                  ? '방을 새로 찾는 중…'
                  : `2명 이상이면 시작 · 정원 ${SEAT_COUNT}명`}
              </Text>
            </View>
          )}
          {(phase === 'playing' || phase === 'reveal') && (
            <>
              {phase === 'playing' ? (
                <Text style={styles.timer}>{sec}s</Text>
              ) : (
                <Text style={styles.centerTitle}>라운드 결과</Text>
              )}
              <View style={styles.choRow}>
                {choseong.map((c, idx) => (
                  <View key={`${c}-${idx}`} style={styles.choTile}>
                    <Text style={styles.choChar}>{c}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.scoreBoard}>
                <Text style={styles.scoreBoardTitle}>점수판 · {winScore}점 선취</Text>
                {(players.length
                  ? players.map((p, idx) => ({ p, idx }))
                  : [{ p: { username: '—', score: 0 }, idx: 0 }]
                ).map(({ p, idx }) => {
                  const palette = paletteForSeat(idx);
                  const isYou = you && p.userId === you.userId;
                  return (
                    <View
                      key={p.userId || `${p.username}-${idx}`}
                      style={[
                        styles.scoreRowWrap,
                        {
                          backgroundColor: palette.soft,
                          borderColor: palette.accent,
                        },
                        isYou && styles.scoreRowYouWrap,
                      ]}
                    >
                      <View
                        style={[styles.scoreDot, { backgroundColor: palette.accent }]}
                      />
                      <Text
                        style={[
                          styles.scoreRow,
                          { color: palette.ink },
                          isYou && styles.scoreRowYou,
                        ]}
                        numberOfLines={1}
                      >
                        {isYou ? '나' : p.username || '플레이어'}{' '}
                        {Number(p.score) || 0}점
                      </Text>
                    </View>
                  );
                })}
              </View>
              {phase === 'reveal' && result ? (
                <Text style={styles.resultHint}>
                  승 {(result.winners || []).map((w) => w.username).join(', ') || '없음'}
                </Text>
              ) : null}
            </>
          )}
          {phase === 'match_end' && (
            <View style={styles.centerBox}>
              <Text style={styles.centerTitle}>경기 종료</Text>
              <Text style={styles.centerText}>방을 새로 찾는 중…</Text>
            </View>
          )}
        </View>

        {renderSeatCol(rightSeats, 'right', 3)}
      </View>

      {phase === 'playing' && (
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
            style={[styles.submitBtn, submitted && styles.submitDisabled]}
            onPress={onSubmit}
            disabled={submitted}
          >
            <Text style={styles.submitText}>
              {submitted ? '제출됨' : '확인'}
            </Text>
          </Pressable>
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
    </KeyboardAvoidingView>
  );
}

function createStyles(normalize) {
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
      gap: normalize(2),
      minHeight: normalize(240),
      paddingTop: normalize(2),
    },
    seatCol: {
      width: normalize(108),
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      gap: normalize(4),
      paddingTop: 0,
    },
    seat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(3),
    },
    seatLeft: { justifyContent: 'flex-start' },
    seatRight: { justifyContent: 'flex-end' },
    seatCard: {
      width: normalize(68),
      paddingVertical: normalize(5),
      paddingHorizontal: normalize(3),
      borderRadius: normalize(10),
      alignItems: 'center',
      borderWidth: 1.5,
    },
    seatFilled: {},
    seatYou: {
      borderWidth: 2.5,
    },
    seatEmpty: {},
    seatEmptyCard: {
      backgroundColor: colors.textLight5,
      borderColor: colors.textLight10,
      borderWidth: 1,
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
    bubble: {
      maxWidth: normalize(48),
      borderWidth: 1,
      borderRadius: normalize(8),
      paddingHorizontal: normalize(4),
      paddingVertical: normalize(2),
    },
    bubbleLeft: {
      marginLeft: normalize(-1),
    },
    bubbleRight: {
      marginRight: normalize(-1),
    },
    bubbleText: {
      fontFamily: fonts.regular,
      fontSize: normalize(9),
      lineHeight: normalize(12),
    },
    centerCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: normalize(4),
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
    },
    choRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: normalize(8),
      marginBottom: normalize(10),
    },
    choTile: {
      width: normalize(52),
      height: normalize(52),
      borderRadius: normalize(12),
      backgroundColor: '#FFF4E8',
      borderWidth: 1.5,
      borderColor: '#E8A06A',
      alignItems: 'center',
      justifyContent: 'center',
    },
    choChar: {
      fontFamily: fonts.bold,
      fontSize: normalize(24),
      color: '#C45C26',
    },
    scoreBoard: {
      alignSelf: 'stretch',
      backgroundColor: '#FAF7F2',
      borderRadius: normalize(12),
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(8),
      gap: normalize(4),
      borderWidth: 1,
      borderColor: '#E8DFD4',
    },
    scoreBoardTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.sm),
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: normalize(4),
    },
    scoreRowWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalize(6),
      paddingHorizontal: normalize(8),
      paddingVertical: normalize(4),
      borderRadius: normalize(8),
      borderWidth: 1,
    },
    scoreRowYouWrap: {
      borderWidth: 2,
    },
    scoreDot: {
      width: normalize(8),
      height: normalize(8),
      borderRadius: normalize(4),
    },
    scoreRow: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      textAlign: 'left',
    },
    scoreRowYou: {
      fontFamily: fonts.bold,
    },
    resultHint: {
      marginTop: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.primaryDark,
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
    feedbackOk: { color: colors.primaryDark },
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
