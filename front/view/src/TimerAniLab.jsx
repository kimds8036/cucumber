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
  hashToGender,
  pickStudyRoomMembers,
  stableSeatIndex,
  truncateStudyUserId,
} from '../../utils/studyRoomLayout';
import {
  getTimerRuntimeState,
  subscribeTimerRuntime,
} from '../../utils/timerRuntimeStore';
import { formatHMS } from './timer/timerHelpers';
import { api } from '../../utils/api';
import { useFriend } from '../../context/FriendContext';
import { useMainShellOptional } from '../../context/MainShellContext';

const CHAIR_DESK = require('../../assets/timer_ani/chair_desk.png');
/** 경로 속도 (px / ms) */
const WALK_PX_PER_MS = 0.18;

function SeatLabels({
  seat,
  displayId,
  elapsedMs,
  showTimer,
  z,
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
        <Text style={labelStyles.idText} numberOfLines={1}>
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
}) {
  const walkMap = WALK_BY_GENDER[gender] || WALK_BY_GENDER.girl;
  const studySrc = STUDY_BY_GENDER[gender] || STUDY_BY_GENDER.girl;
  const x = useSharedValue(layout?.spawnX ?? 0);
  const y = useSharedValue(layout?.spawnY ?? 0);
  const [dir, setDir] = useState('up');
  const [frame, setFrame] = useState(0);
  const [phase, setPhase] = useState('hidden'); // walk | seated | hidden
  const modeRef = useRef(mode);
  const seatRef = useRef(seat);
  const layoutRef = useRef(layout);
  const onEnterDoneRef = useRef(onEnterDone);
  const onExitDoneRef = useRef(onExitDone);

  modeRef.current = mode;
  seatRef.current = seat;
  layoutRef.current = layout;
  onEnterDoneRef.current = onEnterDone;
  onExitDoneRef.current = onExitDone;

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
        const dur = Math.max(180, Math.round(Math.abs(dx) / WALK_PX_PER_MS));
        animateAxis('x', to.x, dur, (ok) => {
          if (!ok || cancelled) return;
          if (Math.abs(dy) >= 1.5) {
            setDir(dy >= 0 ? 'down' : 'up');
            const durY = Math.max(180, Math.round(Math.abs(dy) / WALK_PX_PER_MS));
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
      const dur = Math.max(180, Math.round(Math.abs(dy) / WALK_PX_PER_MS));
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
      const points = buildExitWaypoints(
        layout,
        seat,
        x.value,
        y.value,
      );
      setPhase('walk');
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

  const walkW = layout?.walkW ?? Math.round(seat.studyW);
  const walkH = layout?.walkH ?? Math.round(seat.studyH);
  const boxW = phase === 'seated' ? seat.studyW : walkW;
  const boxH = phase === 'seated' ? seat.studyH : walkH;

  const walkFrames = walkMap[dir] || walkMap.up;
  const source =
    phase === 'seated'
      ? studySrc
      : walkFrames[frame % walkFrames.length];

  return (
    <>
      <Animated.View
        style={[
          style,
          {
            width: boxW,
            height: boxH,
            zIndex: phase === 'walk' ? 90 : (seat?.z || 1) + 2,
          },
        ]}
        pointerEvents="none"
      >
        <Image
          source={source}
          style={{ width: boxW, height: boxH }}
          resizeMode="contain"
        />
      </Animated.View>
      {phase === 'seated' ? (
        <SeatLabels
          seat={seat}
          displayId={displayId}
          elapsedMs={elapsedMs}
          showTimer
          z={seat.z}
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

  const { studyingFriends, refreshStudyingFriends } = useFriend();
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [bgSource, setBgSource] = useState(() => getClassroomBgForDate());
  const [me, setMe] = useState({
    key: 'me',
    userId: null,
    username: '나',
    gender: 'girl',
  });
  const [meReady, setMeReady] = useState(false);
  const [friendsMeta, setFriendsMeta] = useState({});
  const [runtime, setRuntime] = useState(() => getTimerRuntimeState());
  const [nowMs, setNowMs] = useState(Date.now());
  const [otherModes, setOtherModes] = useState({});
  const [otherStartedAt, setOtherStartedAt] = useState({});
  const [selfMode, setSelfMode] = useState(/** @type {'hidden'|'enter'|'seated'} */ ('hidden'));
  const redirectedRef = useRef(false);
  const knownOthersRef = useRef(new Set());
  const firstSyncRef = useRef(true);
  const selfEnterStartedRef = useRef(false);

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

  // 배경 시간대
  useEffect(() => {
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
          gender: hashToGender(uid ?? username),
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

  // 친구 목록 (이름)
  useEffect(() => {
    let alive = true;
    refreshStudyingFriends?.();
    (async () => {
      try {
        const res = await api.get('/api/friends/list');
        const list = res.data?.data ?? [];
        if (!alive) return;
        const meta = {};
        list.forEach((f) => {
          if (f.userId == null) return;
          meta[String(f.userId)] = {
            username: f.username || f.name || '친구',
            gender: hashToGender(f.userId),
          };
        });
        setFriendsMeta(meta);
      } catch {
        // noop
      }
    })();
    return () => {
      alive = false;
    };
  }, [refreshStudyingFriends]);

  // 타이머 런타임
  useEffect(() => subscribeTimerRuntime((s) => setRuntime({ ...s })), []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const selfRunning = !!runtime.isRunning;
  const selfElapsedMs = selfRunning
    ? Math.max(0, nowMs - (runtime.startTimestamp || nowMs))
    : 0;

  const studyingOtherIds = useMemo(
    () =>
      Object.entries(studyingFriends || {})
        .filter(([, v]) => v === true)
        .map(([id]) => String(id))
        .filter((id) => String(me.userId) !== id),
    [studyingFriends, me.userId],
  );

  const room = useMemo(
    () => pickStudyRoomMembers(me.key, studyingOtherIds.map((id) => `u:${id}`)),
    [me.key, studyingOtherIds],
  );

  useEffect(() => {
    if (room.redirected && !redirectedRef.current) {
      redirectedRef.current = true;
      Alert.alert(
        '스터디룸',
        '현재 방이 가득 차 다른 스터디룸으로 안내합니다.',
      );
    }
  }, [room.redirected]);

  // 좌석 배정 (안정 해시)
  const assignments = useMemo(() => {
    const taken = new Set();
    const map = {}; // key -> seatIndex
    const order = [...room.members];
    order.forEach((key) => {
      const idx = stableSeatIndex(key, taken);
      if (idx == null) return;
      taken.add(idx);
      map[key] = idx;
    });
    return map;
  }, [room.members]);

  const selfSeatIndex = assignments[me.key];
  const selfSeat =
    selfRunning && selfSeatIndex != null ? seatByIndex[selfSeatIndex] : null;

  // 본인: 룸 준비 + 타이머 ON → 입장 걷기 / OFF → 즉시 숨김
  useEffect(() => {
    if (!roomReady) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!selfRunning || !selfSeat) {
      setSelfMode('hidden');
      selfEnterStartedRef.current = false;
      return;
    }
    if (!selfEnterStartedRef.current) {
      selfEnterStartedRef.current = true;
      setSelfMode('enter');
    }
  }, [roomReady, selfRunning, selfSeat?.index]);

  // 타인 모드 동기 — 레이아웃·프로필 준비 후에만
  useEffect(() => {
    if (!roomReady) return;

    const roomOtherKeys = room.members.filter((k) => k !== me.key);

    setOtherModes((prev) => {
      const next = { ...prev };
      const initial = firstSyncRef.current;

      roomOtherKeys.forEach((key) => {
        const uid = key.replace(/^u:/, '');
        if (studyingFriends?.[uid] !== true) return;
        if (initial) {
          // 입장 직 이미 공부 중 → 즉시 착석 (점프 방지용으로 레이아웃 준비 후)
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
          roomOtherKeys.includes(key) && studyingFriends?.[uid] === true;
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
        if (studyingFriends?.[uid] === true && !next[key]) {
          next[key] = Date.now();
        }
      });
      return next;
    });
  }, [roomReady, room.members, studyingFriends, me.key]);

  const onSelfEnterDone = useCallback(() => setSelfMode('seated'), []);

  const occupiedSeats = useMemo(() => {
    const set = new Set();
    // 착석 완료 후에만 빈 책상 숨김 (입장 중에는 책상 유지)
    if (selfSeat && selfMode === 'seated') {
      set.add(selfSeat.index);
    }
    Object.entries(otherModes).forEach(([key, mode]) => {
      if (mode !== 'seated') return;
      const idx = assignments[key];
      if (idx != null) set.add(idx);
    });
    return set;
  }, [selfSeat, selfMode, otherModes, assignments]);

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
        />

        {stageReady
          ? layout.seats.map((s) =>
              occupiedSeats.has(s.index) ? null : (
                <Image
                  key={`desk-${s.index}`}
                  source={CHAIR_DESK}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: s.seatX,
                    top: s.seatY,
                    width: s.studyW,
                    height: s.studyH,
                    zIndex: s.z,
                  }}
                  resizeMode="contain"
                />
              ),
            )
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
          />
        ) : null}

        {roomReady
          ? Object.entries(assignments).map(([key, seatIndex]) => {
              if (key === me.key) return null;
              const seat = seatByIndex[seatIndex];
              if (!seat) return null;
              const uid = key.replace(/^u:/, '');
              const meta = friendsMeta[uid] || {
                username: '친구',
                gender: hashToGender(uid),
              };
              const mode = otherModes[key] || 'hidden';
              if (mode === 'hidden') return null;
              const started = otherStartedAt[key] || nowMs;
              return (
                <OtherStudyActor
                  key={key}
                  seat={seat}
                  layout={layout}
                  gender={meta.gender}
                  displayId={meta.username}
                  mode={mode}
                  elapsedMs={Math.max(0, nowMs - started)}
                  onEnterDone={() =>
                    setOtherModes((prev) => ({ ...prev, [key]: 'seated' }))
                  }
                  onExitDone={() => {
                    knownOthersRef.current.delete(key);
                    setOtherModes((prev) => ({ ...prev, [key]: 'hidden' }));
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
