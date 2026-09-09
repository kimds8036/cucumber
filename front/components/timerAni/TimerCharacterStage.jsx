import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Image,
  StyleSheet,
  useWindowDimensions,
  Text,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts } from '../../styles/colors';
import {
  GIRL_IDLE_FRONT,
  GIRL_WALK,
  WALK_FRAME_MS,
} from '../../assets/timer_ani/frames';

/**
 * @typedef {'hidden' | 'walking_in' | 'sitting_down' | 'seated' | 'standing_up' | 'walking_out'} CharacterPhase
 */

const PHASE_LABEL = {
  hidden: '자리 비움',
  walking_in: '걸어 들어오는 중',
  sitting_down: '앉는 중',
  seated: '자리에 앉음 (공부 중)',
  standing_up: '일어나는 중',
  walking_out: '걸어 나가는 중',
};

/**
 * 교실 책상 + 캐릭터 스테이지
 * - isRunning true → 입장 → 착석
 * - isRunning false → 기상 → 퇴장
 * 앉기 스프라이트가 없어, 전면 대기 포즈 + 책상으로 하반신을 가려 착석을 표현합니다.
 */
export default function TimerCharacterStage({
  isRunning = false,
  style,
  showPhaseLabel = true,
}) {
  const { width } = useWindowDimensions();
  const stageW = Math.min(width - 32, 360);
  const stageH = Math.round(stageW * 0.72);
  const charSize = Math.round(stageW * 0.34);
  const deskTop = stageH * 0.58;
  const seatX = stageW * 0.5 - charSize / 2;
  const seatY = deskTop - charSize * 0.72;
  const enterX = -charSize * 1.1;
  const exitX = stageW + charSize * 0.2;

  const [phase, setPhase] = useState(/** @type {CharacterPhase} */ ('hidden'));
  const [dir, setDir] = useState(/** @type {'left'|'right'|'down'|'up'} */ ('right'));
  const [frame, setFrame] = useState(0);
  const [visible, setVisible] = useState(false);

  const x = useSharedValue(enterX);
  const y = useSharedValue(seatY);
  const scaleY = useSharedValue(1);
  const opacity = useSharedValue(0);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const targetRunningRef = useRef(isRunning);
  targetRunningRef.current = isRunning;
  const busyRef = useRef(false);

  const walkFrames = GIRL_WALK[dir] || GIRL_WALK.right;
  const source =
    phase === 'seated' || phase === 'sitting_down' || phase === 'standing_up'
      ? GIRL_IDLE_FRONT
      : walkFrames[frame % walkFrames.length];

  // 걷기 프레임 루프
  useEffect(() => {
    const walking = phase === 'walking_in' || phase === 'walking_out';
    if (!walking) return undefined;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % 4);
    }, WALK_FRAME_MS);
    return () => clearInterval(id);
  }, [phase]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scaleY: scaleY.value },
    ],
    opacity: opacity.value,
  }));

  const runSequence = useCallback(
    (wantRunning) => {
      if (busyRef.current) return;
      const current = phaseRef.current;

      if (wantRunning) {
        if (current === 'seated' || current === 'walking_in' || current === 'sitting_down') {
          return;
        }
        busyRef.current = true;
        setVisible(true);
        setDir('right');
        setFrame(0);
        setPhase('walking_in');
        x.value = enterX;
        y.value = seatY;
        scaleY.value = 1;
        opacity.value = 1;

        x.value = withTiming(
          seatX,
          { duration: 2200, easing: Easing.inOut(Easing.quad) },
          (finished) => {
            if (!finished) {
              busyRef.current = false;
              return;
            }
            runOnJS(setPhase)('sitting_down');
            runOnJS(setDir)('down');
            y.value = withTiming(seatY + charSize * 0.08, {
              duration: 320,
              easing: Easing.out(Easing.cubic),
            });
            scaleY.value = withTiming(
              0.92,
              { duration: 320, easing: Easing.out(Easing.cubic) },
              (done) => {
                if (!done) {
                  busyRef.current = false;
                  return;
                }
                runOnJS(setPhase)('seated');
                busyRef.current = false;
                // 도중에 타이머가 꺼졌으면 이어서 퇴장
                if (!targetRunningRef.current) {
                  runOnJS(runSequence)(false);
                }
              },
            );
          },
        );
        return;
      }

      // wantRunning === false
      if (current === 'hidden' || current === 'walking_out' || current === 'standing_up') {
        return;
      }
      if (current === 'walking_in' || current === 'sitting_down') {
        // 입장 중이면 완료 후 targetRunningRef로 처리
        return;
      }

      busyRef.current = true;
      setPhase('standing_up');
      setDir('down');
      y.value = withTiming(seatY, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
      scaleY.value = withTiming(
        1,
        { duration: 280, easing: Easing.out(Easing.cubic) },
        (done) => {
          if (!done) {
            busyRef.current = false;
            return;
          }
          runOnJS(setDir)('right');
          runOnJS(setFrame)(0);
          runOnJS(setPhase)('walking_out');
          x.value = withTiming(
            exitX,
            { duration: 2000, easing: Easing.inOut(Easing.quad) },
            (finished) => {
              if (!finished) {
                busyRef.current = false;
                return;
              }
              opacity.value = 0;
              runOnJS(setPhase)('hidden');
              runOnJS(setVisible)(false);
              busyRef.current = false;
              if (targetRunningRef.current) {
                runOnJS(runSequence)(true);
              }
            },
          );
        },
      );
    },
    [charSize, enterX, exitX, opacity, scaleY, seatX, seatY, x, y],
  );

  useEffect(() => {
    runSequence(isRunning);
  }, [isRunning, runSequence]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: stageW,
          alignSelf: 'center',
        },
        stage: {
          width: stageW,
          height: stageH,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: '#E8F0E3',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.textLight20,
        },
        floor: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: stageH * 0.42,
          backgroundColor: '#D4C4A8',
        },
        wall: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: stageH * 0.58,
          backgroundColor: '#F3F6F0',
        },
        chalkboard: {
          position: 'absolute',
          alignSelf: 'center',
          top: stageH * 0.08,
          width: stageW * 0.55,
          height: stageH * 0.18,
          borderRadius: 6,
          backgroundColor: '#3D6B4F',
          borderWidth: 3,
          borderColor: '#8B6914',
        },
        desk: {
          position: 'absolute',
          left: stageW * 0.28,
          width: stageW * 0.44,
          top: deskTop,
          height: stageH * 0.14,
          borderRadius: 6,
          backgroundColor: '#C4A574',
          borderWidth: 1,
          borderColor: '#9A7B4F',
          zIndex: 3,
        },
        deskLegL: {
          position: 'absolute',
          left: stageW * 0.32,
          top: deskTop + stageH * 0.12,
          width: 8,
          height: stageH * 0.12,
          backgroundColor: '#A8885C',
          zIndex: 3,
        },
        deskLegR: {
          position: 'absolute',
          right: stageW * 0.32,
          top: deskTop + stageH * 0.12,
          width: 8,
          height: stageH * 0.12,
          backgroundColor: '#A8885C',
          zIndex: 3,
        },
        chair: {
          position: 'absolute',
          left: seatX + charSize * 0.15,
          top: deskTop + 4,
          width: charSize * 0.7,
          height: stageH * 0.08,
          borderRadius: 4,
          backgroundColor: '#8FA3B0',
          zIndex: 1,
        },
        char: {
          position: 'absolute',
          width: charSize,
          height: charSize,
          zIndex: 2,
        },
        charImg: {
          width: '100%',
          height: '100%',
        },
        label: {
          marginTop: 10,
          textAlign: 'center',
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.textSecondary,
        },
      }),
    [charSize, deskTop, seatX, stageH, stageW],
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.stage}>
        <View style={styles.wall} />
        <View style={styles.chalkboard} />
        <View style={styles.floor} />
        <View style={styles.chair} />
        {visible ? (
          <Animated.View style={[styles.char, animStyle]} pointerEvents="none">
            <Image source={source} style={styles.charImg} resizeMode="contain" />
          </Animated.View>
        ) : null}
        {/* 책상은 캐릭터 위(zIndex)라 앉으면 다리가 가려짐 */}
        <View style={styles.desk} />
        <View style={styles.deskLegL} />
        <View style={styles.deskLegR} />
      </View>
      {showPhaseLabel ? (
        <Text style={styles.label}>{PHASE_LABEL[phase] || phase}</Text>
      ) : null}
    </View>
  );
}

export { PHASE_LABEL };
