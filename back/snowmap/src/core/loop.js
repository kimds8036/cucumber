import { CONFIG } from "../config.js";

/**
 * 고정 타임스텝 루프.
 * fixedUpdate(dt): 물리/이동 (고정 dt)
 * frameUpdate(alpha, frameDt): 카메라·렌더 보간용
 */
export function createLoop({ fixedUpdate, frameUpdate }) {
  const fixedDt = CONFIG.FIXED_DT;
  const maxSteps = CONFIG.MAX_FRAME_STEPS;
  let acc = 0;
  let last = performance.now() / 1000;
  let running = false;
  let raf = 0;

  function tick(nowMs) {
    if (!running) return;
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
    raf = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now() / 1000;
      acc = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
