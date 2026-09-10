import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StatusBar } from 'react-native';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../../styles/colors';
import {
  STUDY_BY_GENDER,
  WALK_BY_GENDER,
  WALK_FRAME_MS,
} from '../../assets/timer_ani/frames';
import {
  getClassroomBgForDate,
  nextClassroomBgChangeAt,
} from '../../utils/studyRoomClassroomBg';
import {
  buildSeatLayout,
  buildEnterWaypoints,
  buildExitWaypoints,
  randomGender,
  pickRandomEmptySeat,
  pickStudyRoomMembers,
  truncateStudyUserId,
} from '../../utils/studyRoomLayout';
import {
  getTimerRuntimeState,
  setTimerRuntimeState,
  subscribeTimerRuntime,
} from '../../utils/timerRuntimeStore';
import { formatHMS } from './timer/timerHelpers';
import { api } from '../../utils/api';
import { getTimerDayKey, loadDayFromDb } from '../../utils/timerStorage';
import { preloadStudyRoomAssets } from '../../utils/preloadStudyRoomAssets';
import { useFriend } from '../../context/FriendContext';
import { useSocket } from '../../context/SocketContext';
import { useMainShellOptional } from '../../context/MainShellContext';

const CHAIR_DESK = require('../../assets/timer_ani/chair_desk.png');
/** 경로 속도 (px / ms) — 클수록 빠름 */
const WALK_PX_PER_MS = 0.3;
/** 타이머 OFF 후 스터디룸에서 자리·방 유지 유예 */
const LEAVE_GRACE_MS = 5000;

function SeatLabels({
  seat,
  displayId,
  elapsedMs,
  showTimer,
  z,
  isFriend = false,
}) {
  const labelW = Math.max(seat.studyW * 1.35, 88);
  const labelLeft = seat.seatX + (seat.studyW - labelW) / 2;

  return (
    <>
      {showTimer ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: labelLeft,
            top: Math.max(2, seat.seatY - 16),
            width: labelW,
            alignItems: 'center',
            zIndex: z + 6,
          }}
        >
          <Text style={labelStyles.timerText} numberOfLines={1}>
            {formatHMS(elapsedMs)}
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: labelLeft,
          top: seat.seatY + seat.studyH - 2,
          width: labelW,
          alignItems: 'center',
          zIndex: z + 6,
        }}
      >
        <Text
          style={[labelStyles.idText, isFriend && labelStyles.idTextFriend]}
          numberOfLines={1}
        >
          {truncateStudyUserId(displayId)}
        </Text>
      </View>
    </>
  );
}

const labelStyles = StyleSheet.create({
  timerText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  idText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  idTextFriend: {
    color: colors.primary,
  },
});

/** 본인: 스터디룸 입장·타이머 ON 시 복도 따라 입장 (퇴장은 즉시 숨김) */
function SelfStudyActor(props) {
  return <OtherStudyActor {...props} onExitDone={undefined} />;
}

/**
 * 공용: 하단·열 사이 복도로 들어와 착석 / 퇴장
 * mode 가 바뀔 때만 경로를 시작
 */
function OtherStudyActor({
  seat,
  layout,
  gender,
  displayId,
  mode, // 'enter' | 'seated' | 'exit' | 'hidden'
  onEnterDone,
  onExitDone,
  elapsedMs,
  isFriend = false,
  onSeatedVisualChange,
}) {
  // 등장~퇴장 동안 성별 고정 (idle 시 meta 비움/재랜덤으로 스프라이트 바뀌는 것 방지)
  const lockedGenderRef = useRef(null);
  if (mode === 'enter' || mode === 'seated' || mode === 'exit') {
    if (!lockedGenderRef.current) {
      lockedGenderRef.current =
        gender === 'boy' || gender === 'girl' ? gender : randomGender();
    }
  } else if (mode === 'hidden') {
    lockedGenderRef.current = null;
  }
  const lockedGender = lockedGenderRef.current || gender || 'girl';
  const walkMap = WALK_BY_GENDER[lockedGender] || WALK_BY_GENDER.girl;
  const studySrc = STUDY_BY_GENDER[lockedGender] || STUDY_BY_GENDER.girl;
  const x = useSharedValue(layout?.spawnX ?? 0);
  const y = useSharedValue(layout?.spawnY ?? 0);
  const [dir, setDir] = useState('up');
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState('hidden'); // walk | seated | hidden
  const [studyReady, setStudyReady] = useState(false);
  const modeRef = useRef(mode);
  const seatRef = useRef(seat);
  const layoutRef = useRef(layout);
  const onEnterDoneRef = useRef(onEnterDone);
  const onExitDoneRef = useRef(onExitDone);
  const onSeatedVisualChangeRef = useRef(onSeatedVisualChange);

  modeRef.current = mode;
  seatRef.current = seat;
  layoutRef.current = layout;
  onEnterDoneRef.current = onEnterDone;
  onExitDoneRef.current = onExitDone;
  onSeatedVisualChangeRef.current = onSeatedVisualChange;

  useEffect(() => {
    const ready = phase === 'seated' && studyReady;
    onSeatedVisualChangeRef.current?.(ready);
    return () => onSeatedVisualChangeRef.current?.(false);
  }, [phase, studyReady]);

  useEffect(() => {
    if (phase !== 'seated') {
      setStudyReady(false);
      return undefined;
    }
    // 캐시된 이미지는 onLoad 가 스킵될 수 있어 짧은 폴백
    const t = setTimeout(() => setStudyReady(true), 80);
    return () => clearTimeout(t);
  }, [phase, studySrc]);

  useEffect(() => {
    if (phase !== 'walk') return undefined;
    const id = setInterval(() => setFrame((f) => f + 1), WALK_FRAME_MS);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!seat || !layout) return undefined;

    let cancelled = false;

    const animateAxis = (axis, to, duration, onDone) => {
      const timing = { duration, easing: Easing.linear };
      if (axis === 'x') {
        x.value = withTiming(to, timing, (ok) => {
          if (!cancelled) runOnJS(onDone)(!!ok);
        });
      } else {
        y.value = withTiming(to, timing, (ok) => {
          if (!cancelled) runOnJS(onDone)(!!ok);
        });
      }
    };

    const moveSegment = (from, to, next) => {
      if (cancelled) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) {
        next();
        return;
      }
      // 한 축씩만 (복도 이동)
      if (Math.abs(dx) >= 1.5) {
        setDir(dx >= 0 ? 'right' : 'left');
        const dur = Math.max(120, Math.round(Math.abs(dx) / WALK_PX_PER_MS));
        animateAxis('x', to.x, dur, (ok) => {
          if (!ok || cancelled) return;
          if (Math.abs(dy) >= 1.5) {
            setDir(dy >= 0 ? 'down' : 'up');
            const durY = Math.max(120, Math.round(Math.abs(dy) / WALK_PX_PER_MS));
            animateAxis('y', to.y, durY, (ok2) => {
              if (ok2 && !cancelled) next();
            });
          } else {
            next();
          }
        });
        return;
      }
      setDir(dy >= 0 ? 'down' : 'up');
      const dur = Math.max(120, Math.round(Math.abs(dy) / WALK_PX_PER_MS));
      animateAxis('y', to.y, dur, (ok) => {
        if (ok && !cancelled) next();
      });
    };

    const runWaypoints = (points, done) => {
      let i = 0;
      const step = () => {
        if (cancelled) return;
        if (i >= points.length - 1) {
          done();
          return;
        }
        const a = points[i];
        const b = points[i + 1];
        i += 1;
        moveSegment(a, b, step);
      };
      if (points.length) {
        x.value = points[0].x;
        y.value = points[0].y;
      }
      step();
    };

    if (mode === 'seated') {
      x.value = seat.seatX;
      y.value = seat.seatY;
      setPhase('seated');
      return () => {
        cancelled = true;
      };
    }

    if (mode === 'enter') {
      const points = buildEnterWaypoints(layout, seat);
      setPhase('walk');
      setDir('up');
      runWaypoints(points, () => {
        if (cancelled || modeRef.current !== 'enter') return;
        const s = seatRef.current;
        if (s) {
          x.value = s.seatX;
          y.value = s.seatY;
        }
        setPhase('seated');
        onEnterDoneRef.current?.();
      });
      return () => {
        cancelled = true;
        cancelAnimation(x);
        cancelAnimation(y);
      };
    }

    if (mode === 'exit') {
      // 착석 좌표에서 출발 (shared value 읽기 레이스로 점프·무모션 방지)
      const startX = seat.seatX;
      const startY = seat.seatY;
      x.value = startX;
      y.value = startY;
      setPhase('walk');
      setDir('down');
      const points = buildExitWaypoints(layout, seat, startX, startY);
      runWaypoints(points, () => {
        if (cancelled || modeRef.current !== 'exit') return;
        setPhase('hidden');
        onExitDoneRef.current?.();
      });
      return () => {
        cancelled = true;
        cancelAnimation(x);
        cancelAnimation(y);
      };
    }

    setPhase('hidden');
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode !== 'seated' || !seat) return;
    x.value = seat.seatX;
    y.value = seat.seatY;
  }, [mode, seat?.seatX, seat?.seatY, x, y]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x.value,
    top: y.value,
    opacity: phase === 'hidden' ? 0 : 1,
  }));

  if (!seat || phase === 'hidden') return null;

  // enter/exit 는 setPhase('walk') 반영 전에도 걷기 스프라이트 강제 (착석 이미지로 이동하는 레이스 방지)
  const showWalk =
    mode === 'enter' || mode === 'exit' || phase === 'walk';
  const walkW = layout?.walkW ?? Math.round(seat.studyW);
  const walkH = layout?.walkH ?? Math.round(seat.studyH);
  const boxW = showWalk ? walkW : seat.studyW;
  const boxH = showWalk ? walkH : seat.studyH;

  const walkFrames = walkMap[dir] || walkMap.up;
  const source = showWalk
    ? walkFrames[frame % walkFrames.length]
    : studySrc;

  return (
    <>
      <Animated.View
        style={[
          style,
          {
            width: boxW,
            height: boxH,
            zIndex: showWalk ? 90 : (seat?.z || 1) + 2,
          },
        ]}
        pointerEvents="none"
      >
        <Image
          source={source}
          style={{ width: boxW, height: boxH }}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={() => {
            if (!showWalk) setStudyReady(true);
          }}
        />
      </Animated.View>
      {!showWalk ? (
        <SeatLabels
          seat={seat}
          displayId={displayId}
          elapsedMs={elapsedMs}
          showTimer
          z={seat.z}
          isFriend={isFriend}
        />
      ) : null}
    </>
  );
}

/**
 * 스터디룸 — 타이머 연동 교실 (풀블리드 + 플로팅 뒤로가기)
 */
export default function TimerAniLab({ navigation }) {
  const insets = useSafeAreaInsets();
  const shell = useMainShellOptional();
  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else shell?.navigation?.goBack?.();
  };

  const { refreshStudyingFriends } = useFriend();
  const { socket } = useSocket();
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [bgSource, setBgSource] = useState(() => getClassroomBgForDate());
  const [me, setMe] = useState({
    key: 'me',
    userId: null,
    username: '나',
    gender: 'girl',
  });
  const [meReady, setMeReady] = useState(false);
  /** @type {Record<string, { username: string, gender?: string, startedAtMs: number|null, closedTotalMs?: number }>} */
  const [othersMeta, setOthersMeta] = useState({});
  /** 앱 전체 공부 중 여부 { [userId]: true } — 소켓/API 원본 */
  const [studyingUsers, setStudyingUsers] = useState({});
  /** 스터디룸에 보이는 인원 (OFF 후 LEAVE_GRACE_MS 유예 포함) */
  const [roomPresence, setRoomPresence] = useState({});
  /** 친구 userId 집합 — 아이디 라벨 색 구분 */
  const [friendIds, setFriendIds] = useState(() => new Set());
  const [runtime, setRuntime] = useState(() => getTimerRuntimeState());
  const [nowMs, setNowMs] = useState(Date.now());
  const [otherModes, setOtherModes] = useState({});
  const [otherStartedAt, setOtherStartedAt] = useState({});
  const [selfMode, setSelfMode] = useState(/** @type {'hidden'|'enter'|'seated'} */ ('hidden'));
  /** key -> seatIndex (신규만 빈자리 랜덤, 기존 유지) */
  const [assignments, setAssignments] = useState({});
  const redirectedRef = useRef(false);
  const knownOthersRef = useRef(new Set());
  const firstSyncRef = useRef(true);
  const selfEnterStartedRef = useRef(false);
  /** 퇴장 중에도 좌석 유지 (assignments 에서 빠져도 연출용) */
  const lastSeatIndexRef = useRef(/** @type {Record<string, number>} */ ({}));
  const roomPresenceRef = useRef(roomPresence);
  const leaveGraceTimersRef = useRef(/** @type {Record<string, ReturnType<typeof setTimeout>>} */ ({}));
  const [, bumpSeatSnap] = useState(0);
  /** 착석 스프라이트 로드 전까지 빈 책상 유지 */
  const [deskCoverReady, setDeskCoverReady] = useState(
    /** @type {Record<string, boolean>} */ ({}),
  );

  roomPresenceRef.current = roomPresence;

  const stageReady = stage.w > 80 && stage.h > 80;
  const roomReady = stageReady && meReady;

  const layout = useMemo(
    () =>
      stageReady
        ? buildSeatLayout(stage.w, stage.h)
        : { seats: [], spawnX: 0, spawnY: 0 },
    [stage.w, stage.h, stageReady],
  );
  const seatByIndex = useMemo(() => {
    const m = {};
    layout.seats.forEach((s) => {
      m[s.index] = s;
    });
    return m;
  }, [layout.seats]);

  // 배경 시간대 + 에셋 프리로드 (타이머에서 안 했으면 여기서라도)
  useEffect(() => {
    preloadStudyRoomAssets();
    const apply = () => setBgSource(getClassroomBgForDate());
    apply();
    let timer = setTimeout(function tick() {
      apply();
      timer = setTimeout(tick, Math.max(1000, nextClassroomBgChangeAt() - Date.now()));
    }, Math.max(1000, nextClassroomBgChangeAt() - Date.now()));
    return () => clearTimeout(timer);
  }, []);

  // 본인 프로필 — 자리 배정 전에 로드 완료될 때까지 캐릭터 숨김
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/api/auth/me');
        const data = res.data?.data || res.data || {};
        if (!alive) return;
        const uid = data.id ?? data.userId;
        const username = data.username || data.name || '나';
        setMe({
          key: uid != null ? `u:${uid}` : 'me',
          userId: uid,
          username,
          gender: randomGender(),
        });
      } catch {
        // keep defaults
      } finally {
        if (alive) setMeReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 친구 목록(구분 표시) + 앱 전체 공부 중 목록
  useEffect(() => {
    let alive = true;
    refreshStudyingFriends?.();

    const loadFriends = async () => {
      try {
        const res = await api.get('/api/friends/list');
        const list = res.data?.data ?? [];
        if (!alive) return;
        const ids = new Set();
        const metaPatch = {};
        list.forEach((f) => {
          if (f.userId == null) return;
          const uid = String(f.userId);
          ids.add(uid);
          metaPatch[uid] = {
            username: String(f.username || f.name || '친구').replace(/^@/, ''),
            startedAtMs: null,
          };
        });
        setFriendIds(ids);
        setOthersMeta((prev) => ({ ...metaPatch, ...prev }));
      } catch {
        // noop
      }
    };

    const loadStudying = async () => {
      try {
        const res = await api.get('/api/timer/study-room/studying');
        const list = res.data?.data ?? [];
        if (!alive) return;
        const nextStudying = {};
        const metaPatch = {};
        list.forEach((item) => {
          if (item.userId == null) return;
          const uid = String(item.userId);
          nextStudying[uid] = true;
          const startedMs = item.startedAt
            ? Date.parse(item.startedAt)
            : NaN;
          metaPatch[uid] = {
            username: String(item.username || '학생').replace(/^@/, ''),
            // 이미 화면에 있으면 성별 유지, 새로 보이면 랜덤
            gender: undefined,
            startedAtMs: Number.isFinite(startedMs) ? startedMs : null,
            closedTotalMs: Number(item.closedTotalMs) || 0,
          };
        });
        setStudyingUsers(nextStudying);
        setOthersMeta((prev) => {
          const next = { ...prev };
          Object.entries(metaPatch).forEach(([uid, patch]) => {
            const keepGender = prev[uid]?.gender;
            next[uid] = {
              ...prev[uid],
              ...patch,
              gender: keepGender || randomGender(),
            };
          });
          return next;
        });
        setOtherStartedAt((prev) => {
          const next = { ...prev };
          Object.entries(metaPatch).forEach(([uid, meta]) => {
            const key = `u:${uid}`;
            if (meta.startedAtMs != null && !next[key]) {
              next[key] = meta.startedAtMs;
            }
          });
          return next;
        });
      } catch (error) {
        console.error('[StudyRoom] 공부 중 목록 조회 실패:', error);
      }
    };

    loadFriends();
    loadStudying();
    return () => {
      alive = false;
    };
  }, [refreshStudyingFriends]);

  // 스터디룸 소켓 구독 — 앱 전체 studying 실시간
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('study_room:join');

    const onStatus = (payload) => {
      const uid = payload?.userId != null ? String(payload.userId) : null;
      if (!uid) return;
      const status = payload.status;
      if (status === 'studying') {
        setStudyingUsers((prev) => ({ ...prev, [uid]: true }));
        const startedMs = payload.startedAt
          ? Date.parse(payload.startedAt)
          : Date.now();
        setOthersMeta((prev) => ({
          ...prev,
          [uid]: {
            username: String(
              payload.username || prev[uid]?.username || '학생',
            ).replace(/^@/, ''),
            // 이미 성별 있으면 유지 (퇴장 중 재랜덤 금지). 신규 등장만 랜덤.
            gender: prev[uid]?.gender || randomGender(),
            startedAtMs: Number.isFinite(startedMs) ? startedMs : Date.now(),
            closedTotalMs:
              payload.closedTotalMs != null
                ? Number(payload.closedTotalMs) || 0
                : prev[uid]?.closedTotalMs || 0,
          },
        }));
        setOtherStartedAt((prev) => {
          const key = `u:${uid}`;
          if (prev[key]) return prev;
          return {
            ...prev,
            [key]: Number.isFinite(startedMs) ? startedMs : Date.now(),
          };
        });
      } else if (status === 'idle') {
        setStudyingUsers((prev) => {
          if (!prev[uid]) return prev;
          const next = { ...prev };
          delete next[uid];
          return next;
        });
        // 성별은 퇴장 연출 끝날 때까지 유지 (onExitDone 에서 비움)
      }
    };

    socket.on('study_room_timer_status', onStatus);
    return () => {
      socket.emit('study_room:leave');
      socket.off('study_room_timer_status', onStatus);
    };
  }, [socket]);

  // 타이머 런타임 + 오늘 누적(타이머 화면과 동일 기준)
  useEffect(() => subscribeTimerRuntime((s) => setRuntime({ ...s })), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const day = await loadDayFromDb(getTimerDayKey());
        if (!alive || day?.totalElapsedMs == null) return;
        const cur = Number(getTimerRuntimeState().totalElapsedMs) || 0;
        const fromDb = Number(day.totalElapsedMs) || 0;
        if (fromDb > cur) {
          setTimerRuntimeState({ totalElapsedMs: fromDb });
        }
      } catch {
        // noop
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const selfRunning = !!runtime.isRunning;
  const selfLiveMs = selfRunning
    ? Math.max(0, nowMs - (runtime.startTimestamp || nowMs))
    : 0;
  // 타이머 화면과 동일: 종료 세션 누적 + (실행 중이면 현재 세션)
  const selfElapsedMs = Math.max(0, (Number(runtime.totalElapsedMs) || 0) + selfLiveMs);

  const studyingOtherIds = useMemo(
    () =>
      Object.keys(roomPresence || {})
        .filter((id) => id && String(me.userId) !== id),
    [roomPresence, me.userId],
  );

  const clearLeaveGrace = useCallback((uid) => {
    const t = leaveGraceTimersRef.current[uid];
    if (t) {
      clearTimeout(t);
      delete leaveGraceTimersRef.current[uid];
    }
  }, []);

  const scheduleLeaveGrace = useCallback((uid) => {
    if (leaveGraceTimersRef.current[uid]) return;
    leaveGraceTimersRef.current[uid] = setTimeout(() => {
      delete leaveGraceTimersRef.current[uid];
      setRoomPresence((prev) => {
        if (!prev[uid]) return prev;
        const next = { ...prev };
        delete next[uid];
        return next;
      });
    }, LEAVE_GRACE_MS);
  }, []);

  // 공부 ON → 즉시 출석 / OFF → 5초 뒤 퇴실
  useEffect(() => {
    const selfUid = me.userId != null ? String(me.userId) : null;
    const rawOn = new Set(
      Object.entries(studyingUsers || {})
        .filter(([, v]) => v === true)
        .map(([id]) => String(id)),
    );
    if (selfRunning && selfUid) rawOn.add(selfUid);

    rawOn.forEach((uid) => clearLeaveGrace(uid));

    setRoomPresence((prev) => {
      const next = { ...prev };
      let changed = false;
      rawOn.forEach((uid) => {
        if (!next[uid]) {
          next[uid] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    Object.keys(roomPresenceRef.current).forEach((uid) => {
      if (!rawOn.has(uid)) scheduleLeaveGrace(uid);
    });
  }, [
    studyingUsers,
    selfRunning,
    me.userId,
    clearLeaveGrace,
    scheduleLeaveGrace,
  ]);

  useEffect(
    () => () => {
      Object.keys(leaveGraceTimersRef.current).forEach((uid) => {
        clearTimeout(leaveGraceTimersRef.current[uid]);
      });
      leaveGraceTimersRef.current = {};
    },
    [],
  );

  const selfPresentForRoom = !!(
    me.userId != null && roomPresence[String(me.userId)]
  );

  const room = useMemo(() => {
    const otherKeys = studyingOtherIds.map((id) => `u:${id}`);
    if (selfPresentForRoom) {
      return pickStudyRoomMembers(me.key, otherKeys);
    }
    const seed = otherKeys[0] || me.key;
    const rest = otherKeys[0] ? otherKeys.slice(1) : [];
    const base = pickStudyRoomMembers(seed, rest);
    return {
      ...base,
      members: base.members.filter((k) => k !== me.key),
      redirected: false,
    };
  }, [me.key, studyingOtherIds, selfPresentForRoom]);

  useEffect(() => {
    if (room.redirected && !redirectedRef.current) {
      redirectedRef.current = true;
      Alert.alert(
        '스터디룸',
        '현재 방이 가득 차 다른 스터디룸으로 안내합니다.',
      );
    }
  }, [room.redirected]);

  // 좌석: 신규만 빈자리 랜덤, 기존 자리 유지
  useEffect(() => {
    const members = room.members;
    setAssignments((prev) => {
      const memberSet = new Set(members);
      const next = {};
      const taken = new Set();

      members.forEach((key) => {
        if (prev[key] != null) {
          next[key] = prev[key];
          taken.add(prev[key]);
        }
      });

      Object.entries(otherModes).forEach(([key, mode]) => {
        if (mode !== 'exit' && mode !== 'enter' && mode !== 'seated') return;
        if (memberSet.has(key)) return;
        const idx = prev[key] ?? lastSeatIndexRef.current[key];
        if (idx != null) taken.add(idx);
      });

      members.forEach((key) => {
        if (next[key] != null) return;
        const idx = pickRandomEmptySeat(taken);
        if (idx == null) return;
        next[key] = idx;
        taken.add(idx);
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((k) => prev[k] === next[k])
      ) {
        return prev;
      }
      return next;
    });
  }, [room.members, otherModes]);

  useEffect(() => {
    let changed = false;
    Object.entries(assignments).forEach(([key, idx]) => {
      if (lastSeatIndexRef.current[key] !== idx) {
        lastSeatIndexRef.current[key] = idx;
        changed = true;
      }
    });
    if (changed) bumpSeatSnap((n) => n + 1);
  }, [assignments]);

  const selfUid = me.userId != null ? String(me.userId) : null;
  const selfPresent = !!(selfUid && roomPresence[selfUid]);
  const selfSeatIndex = assignments[me.key];
  const selfSeat =
    selfPresent && selfSeatIndex != null ? seatByIndex[selfSeatIndex] : null;

  // 본인: 유예 포함 출석 유지. 유예 종료 시에만 숨김
  useEffect(() => {
    if (!roomReady) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!selfPresent || !selfSeat) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!selfEnterStartedRef.current) {
      selfEnterStartedRef.current = true;
      setMe((prev) => ({ ...prev, gender: randomGender() }));
      setSelfMode(selfRunning ? 'enter' : 'seated');
    }
  }, [roomReady, selfPresent, selfSeat?.index, selfRunning]);

  // 타인 모드 동기 — presence(유예 포함)
  useEffect(() => {
    if (!roomReady) return;

    const roomOtherKeys = room.members.filter((k) => k !== me.key);

    setOtherModes((prev) => {
      const next = { ...prev };
      const initial = firstSyncRef.current;

      roomOtherKeys.forEach((key) => {
        const uid = key.replace(/^u:/, '');
        if (roomPresence?.[uid] !== true) return;
        if (initial) {
          next[key] = 'seated';
          knownOthersRef.current.add(key);
        } else if (!knownOthersRef.current.has(key)) {
          next[key] = 'enter';
          knownOthersRef.current.add(key);
        }
      });

      Object.keys(next).forEach((key) => {
        if (key === me.key) return;
        const uid = key.replace(/^u:/, '');
        const still =
          roomOtherKeys.includes(key) && roomPresence?.[uid] === true;
        if (!still && next[key] !== 'hidden' && next[key] !== 'exit') {
          next[key] = 'exit';
        }
      });

      firstSyncRef.current = false;
      return next;
    });

    setOtherStartedAt((prev) => {
      const next = { ...prev };
      roomOtherKeys.forEach((key) => {
        const uid = key.replace(/^u:/, '');
        if (roomPresence?.[uid] !== true) return;
        if (next[key]) return;
        const fromMeta = othersMeta[uid]?.startedAtMs;
        next[key] = fromMeta != null ? fromMeta : Date.now();
      });
      return next;
    });
  }, [roomReady, room.members, roomPresence, me.key, othersMeta]);

  const onSelfEnterDone = useCallback(() => setSelfMode('seated'), []);

  /** 화면에 그릴 타인 키: 배정 + 입장/퇴장 진행 중 */
  const otherActorKeys = useMemo(() => {
    const keys = new Set();
    Object.keys(assignments).forEach((k) => {
      if (k !== me.key) keys.add(k);
    });
    Object.entries(otherModes).forEach(([k, mode]) => {
      if (k === me.key) return;
      if (mode === 'enter' || mode === 'seated' || mode === 'exit') {
        keys.add(k);
      }
    });
    return Array.from(keys);
  }, [assignments, otherModes, me.key]);

  const occupiedSeats = useMemo(() => {
    const set = new Set();
    // 착석 스프라이트가 그려진 뒤에만 빈 책상 숨김 (입장·퇴장·로딩 중 유지)
    if (selfSeat && selfMode === 'seated' && deskCoverReady.self) {
      set.add(selfSeat.index);
    }
    Object.entries(otherModes).forEach(([key, mode]) => {
      if (mode !== 'seated') return;
      if (!deskCoverReady[key]) return;
      const idx = assignments[key] ?? lastSeatIndexRef.current[key];
      if (idx != null) set.add(idx);
    });
    return set;
  }, [selfSeat, selfMode, otherModes, assignments, deskCoverReady]);

  const resolveOtherSeat = useCallback(
    (key) => {
      const idx = assignments[key] ?? lastSeatIndexRef.current[key];
      if (idx == null) return null;
      return seatByIndex[idx] || null;
    },
    [assignments, seatByIndex],
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: '#000',
        },
        stage: {
          ...StyleSheet.absoluteFillObject,
        },
        bg: {
          ...StyleSheet.absoluteFillObject,
          width: '100%',
          height: '100%',
        },
        backBtn: {
          position: 'absolute',
          left: 12,
          top: Math.max(insets.top, 8) + 4,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(39,42,38,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
        },
      }),
    [insets.top],
  );

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View
        style={styles.stage}
        collapsable={false}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setStage((prev) =>
            prev.w === w && prev.h === h ? prev : { w, h },
          );
        }}
      >
        <Image
          source={bgSource}
          style={styles.bg}
          resizeMode="cover"
          pointerEvents="none"
          fadeDuration={0}
        />

        {stageReady
          ? layout.seats.map((s) => {
              const occupied = occupiedSeats.has(s.index);
              return (
                <Image
                  key={`desk-${s.index}`}
                  source={CHAIR_DESK}
                  pointerEvents="none"
                  fadeDuration={0}
                  style={{
                    position: 'absolute',
                    left: s.seatX,
                    top: s.seatY,
                    width: s.studyW,
                    height: s.studyH,
                    zIndex: s.z,
                    // 언마운트하지 않고 숨김 — 간헐적 미렌더·깜빡임 방지
                    opacity: occupied ? 0 : 1,
                  }}
                  resizeMode="contain"
                />
              );
            })
          : null}

        {roomReady && selfSeat && selfMode !== 'hidden' ? (
          <SelfStudyActor
            seat={selfSeat}
            layout={layout}
            gender={me.gender}
            displayId={me.username}
            mode={selfMode}
            elapsedMs={selfElapsedMs}
            onEnterDone={onSelfEnterDone}
            onSeatedVisualChange={(ready) =>
              setDeskCoverReady((prev) =>
                prev.self === ready ? prev : { ...prev, self: ready },
              )
            }
          />
        ) : null}

        {roomReady
          ? otherActorKeys.map((key) => {
              const seat = resolveOtherSeat(key);
              if (!seat) return null;
              const uid = key.replace(/^u:/, '');
              const meta = othersMeta[uid] || {
                username: '학생',
              };
              const mode = otherModes[key] || 'hidden';
              if (mode === 'hidden') return null;
              const started = otherStartedAt[key] || meta.startedAtMs || nowMs;
              const closedTotal = Number(meta.closedTotalMs) || 0;
              const liveSessionMs = Math.max(0, nowMs - started);
              const isFriend = friendIds.has(uid);
              return (
                <OtherStudyActor
                  key={key}
                  seat={seat}
                  layout={layout}
                  gender={meta.gender || 'girl'}
                  displayId={meta.username}
                  mode={mode}
                  elapsedMs={closedTotal + liveSessionMs}
                  isFriend={isFriend}
                  onSeatedVisualChange={(ready) =>
                    setDeskCoverReady((prev) =>
                      prev[key] === ready ? prev : { ...prev, [key]: ready },
                    )
                  }
                  onEnterDone={() =>
                    setOtherModes((prev) => ({ ...prev, [key]: 'seated' }))
                  }
                  onExitDone={() => {
                    knownOthersRef.current.delete(key);
                    delete lastSeatIndexRef.current[key];
                    setDeskCoverReady((prev) => {
                      if (!prev[key]) return prev;
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    setOtherModes((prev) => ({ ...prev, [key]: 'hidden' }));
                    setOtherStartedAt((prev) => {
                      if (!prev[key]) return prev;
                      const next = { ...prev };
                      delete next[key];
                      return next;
                    });
                    setOthersMeta((prev) => {
                      if (!prev[uid]) return prev;
                      return {
                        ...prev,
                        [uid]: { ...prev[uid], gender: undefined },
                      };
                    });
                  }}
                />
              );
            })
          : null}
      </View>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={goBack}
        activeOpacity={0.85}
        accessibilityLabel="뒤로가기"
      >
        <Ionicons name="chevron-back" size={24} color={colors.textWhite} />
      </TouchableOpacity>
    </View>
  );
}
