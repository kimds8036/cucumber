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
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';
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

function pickGenderSafe() {
  try {
    if (typeof randomGender === 'function') return randomGender();
  } catch {
    // fallthrough
  }
  return Math.random() < 0.5 ? 'girl' : 'boy';
}

function SeatLabels({
  seat,
  displayId,
  elapsedMs,
  showTimer,
  z,
  isSelf = false,
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
          style={[labelStyles.idText, isSelf && labelStyles.idTextSelf]}
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
  idTextSelf: {
    color: colors.primary,
  },
});

/**
 * 이미지 소스 교체 시 이전 프레임을 유지해 빈 프레임(깜빡임)을 줄임.
 * 걷기 프레임끼리 전환은 즉시, 착석↔걷기는 onLoad 후 교체.
 * 크기는 반드시 width/height 로 고정 — absoluteFill 만 쓰면 원본 px 로 커질 수 있음.
 */
function StableSprite({
  source,
  width,
  height,
  holdUntilLoad = false,
  onDisplayed,
}) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const [shown, setShown] = useState(source);
  const [pending, setPending] = useState(null);
  const shownRef = useRef(source);
  const pendingRef = useRef(null);
  const onDisplayedRef = useRef(onDisplayed);
  onDisplayedRef.current = onDisplayed;

  const commit = (next) => {
    shownRef.current = next;
    pendingRef.current = null;
    setShown(next);
    setPending(null);
    onDisplayedRef.current?.();
  };

  useEffect(() => {
    if (source === shownRef.current) {
      pendingRef.current = null;
      setPending(null);
      return undefined;
    }
    if (!holdUntilLoad) {
      commit(source);
      return undefined;
    }
    pendingRef.current = source;
    setPending(source);
    const t = setTimeout(() => {
      if (pendingRef.current === source) commit(source);
    }, 90);
    return () => clearTimeout(t);
  }, [source, holdUntilLoad]);

  const imgStyle = { width: w, height: h };

  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Image
        source={shown}
        style={imgStyle}
        resizeMode="contain"
        fadeDuration={0}
      />
      {pending ? (
        <Image
          source={pending}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: w,
            height: h,
            opacity: 0,
          }}
          resizeMode="contain"
          fadeDuration={0}
          onLoad={() => {
            if (pendingRef.current === pending) commit(pending);
          }}
          onLoadEnd={() => {
            if (pendingRef.current === pending) commit(pending);
          }}
        />
      ) : null}
    </View>
  );
}

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
  isSelf = false,
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
    // seated 이탈 시 cleanup 에서 false 로 책상을 바로 켜면 깜빡임 → seated 일 때만 알림
  }, [phase, studyReady]);

  useEffect(() => {
    if (phase === 'seated') return undefined;
    onSeatedVisualChangeRef.current?.(false);
    setStudyReady(false);
    return undefined;
  }, [phase]);

  useEffect(() => {
    if (phase !== 'seated') return undefined;
    // 캐시된 이미지는 onLoad 가 스킵될 수 있어 짧은 폴백
    const t = setTimeout(() => setStudyReady(true), 120);
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
        const nextDir = dx >= 0 ? 'right' : 'left';
        setDir((prev) => (prev === nextDir ? prev : nextDir));
        const dur = Math.max(120, Math.round(Math.abs(dx) / WALK_PX_PER_MS));
        animateAxis('x', to.x, dur, (ok) => {
          if (!ok || cancelled) return;
          if (Math.abs(dy) >= 1.5) {
            const nextDirY = dy >= 0 ? 'down' : 'up';
            setDir((prev) => (prev === nextDirY ? prev : nextDirY));
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
      const nextDir = dy >= 0 ? 'down' : 'up';
      setDir((prev) => (prev === nextDir ? prev : nextDir));
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
  }));

  // enter/exit 는 setPhase('walk') 반영 전에도 걷기 스프라이트 강제
  const showWalk =
    mode === 'enter' || mode === 'exit' || phase === 'walk';
  const prevShowWalkRef = useRef(showWalk);
  const holdPoseRef = useRef(false);
  if (prevShowWalkRef.current !== showWalk) {
    holdPoseRef.current = true;
    prevShowWalkRef.current = showWalk;
  }

  // mode 가 완전히 hidden 일 때만 제거 (exit 중 phase hidden 직 공백 방지)
  if (!seat || mode === 'hidden') return null;
  if (phase === 'hidden' && mode !== 'exit' && mode !== 'enter') return null;

  // 걷기는 walk 크기, 착석은 study 크기
  const boxW = Math.max(
    1,
    Math.round(
      Number(
        showWalk
          ? layout?.walkW ?? seat.studyW * 0.92
          : seat.studyW,
      ) || 1,
    ),
  );
  const boxH = Math.max(
    1,
    Math.round(
      Number(
        showWalk
          ? layout?.walkH ?? seat.studyH * 0.92
          : seat.studyH,
      ) || 1,
    ),
  );

  const walkFrames = walkMap[dir] || walkMap.up;
  const source = showWalk
    ? walkFrames[frame % walkFrames.length]
    : studySrc;
  const hidden = phase === 'hidden';

  return (
    <>
      <Animated.View
        collapsable={false}
        style={[
          style,
          {
            width: boxW,
            height: boxH,
            overflow: 'hidden',
            opacity: hidden ? 0 : 1,
            zIndex: showWalk ? 90 : (seat?.z || 1) + 2,
          },
        ]}
        pointerEvents="none"
      >
        <StableSprite
          source={source}
          width={boxW}
          height={boxH}
          holdUntilLoad={holdPoseRef.current || !showWalk}
          onDisplayed={() => {
            holdPoseRef.current = false;
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
          isSelf={isSelf}
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
  const isFocused = useIsFocused();
  const shell = useMainShellOptional();
  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else shell?.navigation?.goBack?.();
  };

  const { refreshStudyingFriends } = useFriend();
  const { socket } = useSocket();
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [bgSource, setBgSource] = useState(() => getClassroomBgForDate());
  /** 서버 배정 방 ID */
  const [serverRoomId, setServerRoomId] = useState(/** @type {string|null} */ (null));
  const [me, setMe] = useState({
    key: 'me',
    userId: null,
    username: '나',
    gender: 'girl',
  });
  const [meReady, setMeReady] = useState(false);
  /** 최초 공부중 목록 API 완료 — 이 시점 출석자는 착석, 이후만 입장 걷기 */
  const [studyingBootstrapDone, setStudyingBootstrapDone] = useState(false);
  /** @type {Record<string, { username: string, gender?: string, startedAtMs: number|null, closedTotalMs?: number }>} */
  const [othersMeta, setOthersMeta] = useState({});
  /** 내 방 공부 중 여부 { [userId]: true } — 서버 방 멤버 + 소켓 */
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
  /** 스터디룸 진입 시점 이미 공부 중이던 userId — 이 사람들은 항상 착석(입장 걷기 없음) */
  const initialStudyingSeedRef = useRef(/** @type {Set<string>|null} */ (null));
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

    const applyRoomMembers = (members, roomId, relocated) => {
      const list = Array.isArray(members)
        ? members.filter((item) => item != null && typeof item === 'object')
        : [];
      const nextStudying = {};
      const metaPatch = {};
      for (let i = 0; i < list.length; i += 1) {
        const item = list[i];
        if (item.userId == null) continue;
        const uid = String(item.userId);
        nextStudying[uid] = true;
        const startedMs = item.startedAt ? Date.parse(item.startedAt) : NaN;
        metaPatch[uid] = {
          username: String(item.username || '학생').replace(/^@/, ''),
          gender: undefined,
          startedAtMs: Number.isFinite(startedMs) ? startedMs : null,
          closedTotalMs: Number(item.closedTotalMs) || 0,
        };
      }
      if (roomId != null) setServerRoomId(String(roomId));
      setStudyingUsers(nextStudying);
      if (!initialStudyingSeedRef.current) {
        initialStudyingSeedRef.current = new Set(Object.keys(nextStudying));
      }
      setOthersMeta((prev) => {
        const next = { ...prev };
        Object.keys(metaPatch).forEach((uid) => {
          const patch = metaPatch[uid];
          const keepGender = prev[uid]?.gender;
          next[uid] = {
            ...prev[uid],
            ...patch,
            gender:
              keepGender === 'boy' || keepGender === 'girl'
                ? keepGender
                : pickGenderSafe(),
          };
        });
        return next;
      });
      setOtherStartedAt((prev) => {
        const next = { ...prev };
        Object.keys(metaPatch).forEach((uid) => {
          const key = `u:${uid}`;
          const startedAtMs = metaPatch[uid]?.startedAtMs;
          if (startedAtMs != null && !next[key]) {
            next[key] = startedAtMs;
          }
        });
        return next;
      });
      if (relocated && !redirectedRef.current) {
        redirectedRef.current = true;
        setTimeout(() => {
          if (typeof Alert?.alert === 'function') {
            Alert.alert(
              '스터디룸',
              '이전 방이 가득 차 다른 스터디룸으로 안내합니다.',
            );
          }
        }, 0);
      }
    };

    const loadStudying = async () => {
      try {
        const res = await api.get('/api/timer/study-room/studying');
        const data = res?.data?.data;
        if (!alive) return;
        // 신규: { roomId, members } / 구형 배열 호환
        if (Array.isArray(data)) {
          applyRoomMembers(data, null, false);
        } else if (data && typeof data === 'object') {
          applyRoomMembers(
            Array.isArray(data.members) ? data.members : [],
            data.roomId ?? null,
            data.relocated === true,
          );
        } else {
          applyRoomMembers([], null, false);
        }
      } catch (error) {
        console.error(
          '[StudyRoom] 공부 중 목록 조회 실패:',
          error?.message || error,
        );
        if (!initialStudyingSeedRef.current) {
          initialStudyingSeedRef.current = new Set();
        }
      } finally {
        if (alive) setStudyingBootstrapDone(true);
      }
    };

    loadFriends();
    loadStudying();
    return () => {
      alive = false;
    };
  }, [refreshStudyingFriends]);

  // 스터디룸 소켓 — 서버가 배정한 방만 수신
  useEffect(() => {
    if (!socket) return undefined;
    socket.emit('study_room:join');
    const roomIdRef = { current: serverRoomId };

    const onJoined = (payload) => {
      if (!payload || payload.error) return;
      if (payload.roomId != null) {
        roomIdRef.current = String(payload.roomId);
        setServerRoomId(String(payload.roomId));
      }
      const list = payload.members;
      if (!Array.isArray(list)) return;
      setStudyingUsers((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (item?.userId != null) next[String(item.userId)] = true;
        });
        return next;
      });
      list.forEach((item) => {
        if (item?.userId == null) return;
        const uid = String(item.userId);
        const startedMs = item.startedAt ? Date.parse(item.startedAt) : NaN;
        setOthersMeta((prev) => ({
          ...prev,
          [uid]: {
            username: String(
              item.username || prev[uid]?.username || '학생',
            ).replace(/^@/, ''),
            gender: prev[uid]?.gender || pickGenderSafe(),
            startedAtMs: Number.isFinite(startedMs)
              ? startedMs
              : prev[uid]?.startedAtMs ?? null,
            closedTotalMs:
              item.closedTotalMs != null
                ? Number(item.closedTotalMs) || 0
                : prev[uid]?.closedTotalMs || 0,
          },
        }));
      });
      if (payload.relocated && !redirectedRef.current) {
        redirectedRef.current = true;
        setTimeout(() => {
          if (typeof Alert?.alert === 'function') {
            Alert.alert(
              '스터디룸',
              '이전 방이 가득 차 다른 스터디룸으로 안내합니다.',
            );
          }
        }, 0);
      }
    };

    const onStatus = (payload) => {
      const uid = payload?.userId != null ? String(payload.userId) : null;
      if (!uid) return;
      if (
        payload.roomId != null &&
        roomIdRef.current != null &&
        String(payload.roomId) !== String(roomIdRef.current)
      ) {
        return;
      }
      if (payload.roomId != null && roomIdRef.current == null) {
        roomIdRef.current = String(payload.roomId);
        setServerRoomId(String(payload.roomId));
      }
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
            gender: prev[uid]?.gender || pickGenderSafe(),
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
      }
    };

    socket.on('study_room:joined', onJoined);
    socket.on('study_room_timer_status', onStatus);
    return () => {
      socket.emit('study_room:leave');
      socket.off('study_room:joined', onJoined);
      socket.off('study_room_timer_status', onStatus);
    };
    // serverRoomId 초기값만 사용 — 변경 시 재구독하지 않음
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 타이머 화면은 blur 시 keep-awake 해제 → 스터디룸에서도 실행 중이면 유지
  useEffect(() => {
    const tag = 'youth-paper-study-room';
    if (!isFocused || !selfRunning) {
      deactivateKeepAwake(tag);
      return undefined;
    }
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag);
    };
  }, [isFocused, selfRunning]);

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

  // 서버가 배정한 방 멤버만 (클라이언트 전체 분할 없음)
  const room = useMemo(() => {
    const members = [];
    const seen = new Set();
    Object.keys(roomPresence || {}).forEach((uid) => {
      if (!roomPresence[uid]) return;
      const key = `u:${uid}`;
      if (seen.has(key)) return;
      seen.add(key);
      members.push(key);
    });
    if (selfPresentForRoom && me.key && !seen.has(me.key)) {
      members.push(me.key);
    }
    members.sort((a, b) => a.localeCompare(b, 'en'));
    return {
      roomIndex: 0,
      members,
      redirected: false,
      roomId: serverRoomId,
    };
  }, [roomPresence, selfPresentForRoom, me.key, serverRoomId]);

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

  // 본인: 스터디룸 입장 시(타이머 실행 전제) 복도 걸어 들어와 착석. 퇴장 걷기는 없음.
  useEffect(() => {
    if (!roomReady) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!studyingBootstrapDone) return;
    if (!selfPresent || !selfSeat) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!selfEnterStartedRef.current) {
      selfEnterStartedRef.current = true;
      setMe((prev) => ({ ...prev, gender: randomGender() }));
      if (selfUid && initialStudyingSeedRef.current) {
        initialStudyingSeedRef.current.add(selfUid);
      }
      setSelfMode('enter');
    }
  }, [roomReady, studyingBootstrapDone, selfPresent, selfSeat?.index, selfUid]);

  // 타인 모드 동기 — 진입 시 이미 공부 중이면 착석, 이후에 켠 사람만 입장 걷기
  useEffect(() => {
    if (!roomReady || !studyingBootstrapDone) return;
    if (!initialStudyingSeedRef.current) return;

    const seed = initialStudyingSeedRef.current;
    const roomOtherKeys = room.members.filter((k) => k !== me.key);

    setOtherModes((prev) => {
      const next = { ...prev };

      roomOtherKeys.forEach((key) => {
        const uid = key.replace(/^u:/, '');
        if (roomPresence?.[uid] !== true) return;
        if (knownOthersRef.current.has(key)) return;
        knownOthersRef.current.add(key);
        next[key] = seed.has(uid) ? 'seated' : 'enter';
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
  }, [
    roomReady,
    studyingBootstrapDone,
    room.members,
    roomPresence,
    me.key,
    othersMeta,
  ]);

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
            isSelf
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
              return (
                <OtherStudyActor
                  key={key}
                  seat={seat}
                  layout={layout}
                  gender={meta.gender || 'girl'}
                  displayId={meta.username}
                  mode={mode}
                  elapsedMs={closedTotal + liveSessionMs}
                  isSelf={false}
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
                    initialStudyingSeedRef.current?.delete(uid);
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
