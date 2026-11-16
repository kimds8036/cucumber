import { CONFIG } from "../config.js";

/**
 * 고정 타임스텝 루프.
 * fixedUpdate(dt): 물리/이동 (고정 dt)
 * frameUpdate(alpha, frameDt): 카메라·렌더 보간용
 * getMaxFps(): 이번 프레임의 최대 fps. 0이면 제한 없음.
 *   화면 주사율(120Hz 폰이면 초당 120번)대로 그리면 발열이 크다. 움직일 때 60, 가만히 있으면 30처럼 낮춘다.
 */
export function createLoop({ fixedUpdate, frameUpdate, getMaxFps }) {
  const fixedDt = CONFIG.FIXED_DT;
  const maxSteps = CONFIG.MAX_FRAME_STEPS;
  let acc = 0;
  let last = performance.now() / 1000;
  let lastFrameMs = 0;
  let running = false;
  let raf = 0;

  function tick(nowMs) {
    if (!running) return;
    raf = requestAnimationFrame(tick);

    // fps 상한: 지난 프레임에서 충분히 지나지 않았으면 이번 화면 갱신은 건너뛴다.
    // 1.5ms 여유는 주사율 흔들림 때문에 프레임을 한 번씩 놓치지 않게 하려는 것.
    const maxFps = Number(getMaxFps?.()) || 0;
    if (maxFps > 0 && lastFrameMs && nowMs - lastFrameMs < 1000 / maxFps - 1.5) return;
    lastFrameMs = nowMs;

    const now = nowMs / 1000;
    let frameDt = Math.min(now - last, 0.1);
    last = now;
    acc += frameDt;

    let steps = 0;
    while (acc >= fixedDt && steps < maxSteps) {
      fixedUpdate(fixedDt);
      acc -= fixedDt;
      steps += 1;
    }
    if (steps === maxSteps) acc = 0;

    const alpha = acc / fixedDt;
    frameUpdate(alpha, frameDt);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now() / 1000;
      lastFrameMs = 0;
      acc = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}
