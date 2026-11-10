import { CONFIG } from "../config.js";

/**
 * F4: fps, 물리 시간, 프레임당 스텝, 레이캐스트, 드로우콜.
 * 글자는 0.25초마다만 바꿔 레이아웃을 흔들지 않는다.
 */
export function createPerfHud() {
  const el = document.createElement("div");
  el.id = "perf-hud";
  el.hidden = true;
  document.body.appendChild(el);

  let on = false;
  let acc = 0;
  let frames = 0;

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key !== CONFIG.DEBUG_PERF_KEY && event.code !== "F4") return;
    event.preventDefault();
    on = !on;
    el.hidden = !on;
    acc = 0;
    frames = 0;
  });

  /**
   * @param {number} dt
   * @param {{ fixedMs: number, steps: number, raycasts: number, calls: number }} info
   */
  function frame(dt, info) {
    frames += 1;
    acc += dt;
    if (!on) {
      if (acc > 1) {
        acc = 0;
        frames = 0;
      }
      return;
    }
    if (acc < 0.25) return;
    const fps = frames / acc;
    el.textContent =
      `fps ${fps.toFixed(0)}  fixed ${info.fixedMs.toFixed(2)}ms  steps ${info.steps}` +
      `  rays ${info.raycasts}  calls ${info.calls}`;
    acc = 0;
    frames = 0;
  }

  return { frame };
}
