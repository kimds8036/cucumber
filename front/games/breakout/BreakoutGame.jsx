/**
 * 벽돌깨기 (Breakout) — 독립 미니게임 모듈
 * 패들: pageX 기준 추적 (locationX 튐 방지)
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  PanResponder,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, fontSizes } from '../../styles/colors';
import { getNormalize } from '../../styles/frame.style';

const ROWS = 5;
const COLS = 8;
const ITEM_CHANCE = 0.28;
const MAX_BALLS = 6;
const START_LIVES = 3;

/** 벽돌 주황 팔레트 */
const BRICK_COLORS = ['#C45C26', '#D9793D', '#E08A4C', '#E8A06A', '#F0B27A'];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function createBricks(W, brickH, gap, top) {
  const brickW = (W - gap * (COLS + 1)) / COLS;
  const list = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      list.push({
        id: `b-${r}-${c}`,
        x: gap + c * (brickW + gap),
        y: top + r * (brickH + gap),
        w: brickW,
        h: brickH,
        alive: true,
        color: BRICK_COLORS[r % BRICK_COLORS.length],
      });
    }
  }
  return list;
}

function createBall(cx, cy, speed, angle) {
  return {
    id: `ball-${Math.random().toString(36).slice(2, 9)}`,
    x: cx,
    y: cy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 7,
  };
}

function circleRectHit(ball, rect) {
  const nearestX = clamp(ball.x, rect.x, rect.x + rect.w);
  const nearestY = clamp(ball.y, rect.y, rect.y + rect.h);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  return dx * dx + dy * dy <= ball.r * ball.r;
}

export default function BreakoutGame() {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const normalize = useMemo(() => getNormalize(screenW), [screenW]);
  const styles = useMemo(() => createStyles(normalize), [normalize]);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [status, setStatus] = useState('ready');
  const [frame, setFrame] = useState(0);

  const areaRef = useRef({ w: screenW, h: Math.max(320, screenH * 0.55) });
  const areaOriginXRef = useRef(0);
  const playAreaNodeRef = useRef(null);
  const paddleRef = useRef({ x: 0, y: 0, w: 88, h: 14 });
  const ballsRef = useRef([]);
  const bricksRef = useRef([]);
  const itemsRef = useRef([]);
  const statusRef = useRef('ready');
  const scoreRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const initedRef = useRef(false);
  /** 드래그 중 목표 X (렌더·레이아웃과 무관하게 유지) */
  const paddleTargetXRef = useRef(null);

  const syncStatus = useCallback((next) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const resetLevel = useCallback(() => {
    const { w, h } = areaRef.current;
    const gap = 4;
    const brickH = 16;
    bricksRef.current = createBricks(w, brickH, gap, 12);
    const pw = Math.min(96, w * 0.28);
    const px = (w - pw) / 2;
    paddleRef.current = { x: px, y: h - 36, w: pw, h: 14 };
    paddleTargetXRef.current = px;
    ballsRef.current = [
      createBall(w / 2, h - 56, Math.min(320, 220 + w * 0.12), (-Math.PI / 2) * 0.85),
    ];
    itemsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = START_LIVES;
    setScore(0);
    setLives(START_LIVES);
    syncStatus('ready');
    setFrame((n) => n + 1);
  }, [syncStatus]);

  const movePaddleToPageX = useCallback((pageX) => {
    const { w } = areaRef.current;
    const p = paddleRef.current;
    const localX = pageX - areaOriginXRef.current;
    const next = clamp(localX - p.w / 2, 0, w - p.w);
    paddleTargetXRef.current = next;
    p.x = next;
    setFrame((n) => n + 1);
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          playAreaNodeRef.current?.measureInWindow((x) => {
            areaOriginXRef.current = x;
            movePaddleToPageX(evt.nativeEvent.pageX);
          });
          if (statusRef.current === 'ready') syncStatus('playing');
        },
        onPanResponderMove: (evt) => {
          movePaddleToPageX(evt.nativeEvent.pageX);
        },
      }),
    [movePaddleToPageX, syncStatus],
  );

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const step = (t) => {
      raf = requestAnimationFrame(step);
      if (!last) last = t;
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;

      // 패들은 매 프레임 목표 위치 유지 (물리/리렌더에 의해 튕기지 않음)
      if (paddleTargetXRef.current != null) {
        paddleRef.current.x = paddleTargetXRef.current;
      }

      if (statusRef.current !== 'playing') return;

      const { w, h } = areaRef.current;
      const paddle = paddleRef.current;
      const bricks = bricksRef.current;
      const items = itemsRef.current;

      const nextBalls = [];
      for (const ball of ballsRef.current) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x - ball.r <= 0) {
          ball.x = ball.r;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.r >= w) {
          ball.x = w - ball.r;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y - ball.r <= 0) {
          ball.y = ball.r;
          ball.vy = Math.abs(ball.vy);
        }

        if (circleRectHit(ball, paddle) && ball.vy > 0) {
          ball.y = paddle.y - ball.r - 0.5;
          const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          const angle = -Math.PI / 2 + hit * (Math.PI / 3);
          const speed = Math.hypot(ball.vx, ball.vy) || 240;
          ball.vx = Math.cos(angle) * speed;
          ball.vy = Math.sin(angle) * speed;
          if (ball.vy > 0) ball.vy *= -1;
        }

        for (const brick of bricks) {
          if (!brick.alive) continue;
          if (!circleRectHit(ball, brick)) continue;
          brick.alive = false;
          scoreRef.current += 10;
          setScore(scoreRef.current);
          const overlapL = ball.x + ball.r - brick.x;
          const overlapR = brick.x + brick.w - (ball.x - ball.r);
          const overlapT = ball.y + ball.r - brick.y;
          const overlapB = brick.y + brick.h - (ball.y - ball.r);
          if (Math.min(overlapL, overlapR) < Math.min(overlapT, overlapB)) {
            ball.vx *= -1;
          } else {
            ball.vy *= -1;
          }
          if (Math.random() < ITEM_CHANCE) {
            items.push({
              id: `item-${Math.random().toString(36).slice(2, 8)}`,
              x: brick.x + brick.w / 2 - 9,
              y: brick.y + brick.h / 2,
              w: 18,
              h: 18,
              vy: 110,
              type: 'multiball',
            });
          }
          break;
        }

        if (ball.y - ball.r <= h) nextBalls.push(ball);
      }
      ballsRef.current = nextBalls;

      const nextItems = [];
      for (const item of items) {
        item.y += item.vy * dt;
        if (
          item.y + item.h >= paddle.y &&
          item.y <= paddle.y + paddle.h &&
          item.x + item.w >= paddle.x &&
          item.x <= paddle.x + paddle.w
        ) {
          if (item.type === 'multiball' && ballsRef.current.length < MAX_BALLS) {
            const base = ballsRef.current[0] || {
              x: paddle.x + paddle.w / 2,
              y: paddle.y - 20,
            };
            ballsRef.current.push(
              createBall(base.x, base.y, 260, -Math.PI / 2.4),
            );
          }
          continue;
        }
        if (item.y <= h) nextItems.push(item);
      }
      itemsRef.current = nextItems;

      if (ballsRef.current.length === 0) {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) syncStatus('lost');
        else {
          ballsRef.current = [
            createBall(
              paddle.x + paddle.w / 2,
              paddle.y - 20,
              240,
              -Math.PI / 2.2,
            ),
          ];
          syncStatus('ready');
        }
      }

      if (bricks.every((b) => !b.alive)) syncStatus('won');
      setFrame((n) => n + 1);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [syncStatus]);

  const onLayoutArea = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    areaRef.current = { w: width, h: height };
    playAreaNodeRef.current?.measureInWindow((x) => {
      areaOriginXRef.current = x;
    });
    // 최초 1회만 레벨 생성 — 레이아웃 요동으로 패들이 리셋되지 않게
    if (!initedRef.current) {
      initedRef.current = true;
      resetLevel();
    } else {
      paddleRef.current.y = height - 36;
      if (paddleTargetXRef.current != null) {
        paddleRef.current.x = clamp(
          paddleTargetXRef.current,
          0,
          width - paddleRef.current.w,
        );
        paddleTargetXRef.current = paddleRef.current.x;
      }
    }
  };

  const paddle = paddleRef.current;
  const balls = ballsRef.current;
  const bricks = bricksRef.current;
  const items = itemsRef.current;
  void frame;

  return (
    <View style={styles.root}>
      <Text style={styles.meta}>
        점수 {score} · 목숨 {lives} · 공 {balls.length}
      </Text>
      <View
        ref={playAreaNodeRef}
        style={styles.playArea}
        onLayout={onLayoutArea}
        {...panResponder.panHandlers}
      >
        {bricks.map(
          (b) =>
            b.alive && (
              <View
                key={b.id}
                style={[
                  styles.brick,
                  {
                    left: b.x,
                    top: b.y,
                    width: b.w,
                    height: b.h,
                    backgroundColor: b.color,
                  },
                ]}
              />
            ),
        )}
        {items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.item,
              { left: item.x, top: item.y, width: item.w, height: item.h },
            ]}
          >
            <Ionicons name="add-circle" size={normalize(16)} color="#fff" />
          </View>
        ))}
        {balls.map((ball) => (
          <View
            key={ball.id}
            style={[
              styles.ball,
              {
                left: ball.x - ball.r,
                top: ball.y - ball.r,
                width: ball.r * 2,
                height: ball.r * 2,
                borderRadius: ball.r,
              },
            ]}
          />
        ))}
        <View
          style={[
            styles.paddle,
            {
              left: paddle.x,
              top: paddle.y,
              width: paddle.w,
              height: paddle.h,
            },
          ]}
        />

        {(status === 'ready' || status === 'won' || status === 'lost') && (
          <View style={styles.overlay} pointerEvents="box-none">
            <Text style={styles.overlayTitle}>
              {status === 'ready'
                ? '화면을 터치해 시작'
                : status === 'won'
                  ? '클리어!'
                  : '게임 오버'}
            </Text>
            {status !== 'ready' ? (
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  initedRef.current = false;
                  resetLevel();
                  initedRef.current = true;
                }}
              >
                <Text style={styles.retryText}>다시 하기</Text>
              </Pressable>
            ) : (
              <Text style={styles.overlayHint}>
                좌우로 드래그해 패들을 움직이세요
              </Text>
            )}
          </View>
        )}
      </View>
      <Text style={styles.tip}>아이템(+)을 먹으면 공이 늘어나요</Text>
    </View>
  );
}

function createStyles(normalize) {
  return StyleSheet.create({
    root: { flex: 1 },
    meta: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: '#C45C26',
      marginBottom: normalize(8),
    },
    playArea: {
      flex: 1,
      borderRadius: normalize(16),
      backgroundColor: '#FFF8F2',
      overflow: 'hidden',
      position: 'relative',
    },
    brick: {
      position: 'absolute',
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.08)',
    },
    ball: {
      position: 'absolute',
      backgroundColor: colors.textPrimary,
    },
    paddle: {
      position: 'absolute',
      borderRadius: 8,
      backgroundColor: '#8B4518',
    },
    item: {
      position: 'absolute',
      borderRadius: 9,
      backgroundColor: '#D9793D',
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.55)',
      paddingHorizontal: normalize(20),
    },
    overlayTitle: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.title),
      color: colors.textPrimary,
      marginBottom: normalize(8),
      textAlign: 'center',
    },
    overlayHint: {
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.md),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: normalize(8),
      backgroundColor: '#C45C26',
      paddingHorizontal: normalize(20),
      paddingVertical: normalize(10),
      borderRadius: normalize(10),
    },
    retryText: {
      fontFamily: fonts.bold,
      fontSize: normalize(fontSizes.md),
      color: colors.textWhite,
    },
    tip: {
      marginTop: normalize(8),
      fontFamily: fonts.regular,
      fontSize: normalize(fontSizes.sm),
      color: colors.textLight40,
      textAlign: 'center',
    },
  });
}
