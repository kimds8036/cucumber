import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 애니 상태 머신: idle(stay) / walk / run / sit / sitHi / lay
 *
 * 규칙:
 * - stay: 루프 (STAY_LOOP)
 * - sit: 앉기 = 거꾸로 재생 (SIT_REVERSE_TIMESCALE), 일어서기 = 정방향
 * - sitHi: 앉은 채 인사 (Phase 6 멀티유저 훅)
 * - lay: 정방향 = 눕기, 역재생 = 일어서기 (sit으로 일어나면 대각선으로 남음)
 */
export function createAnimationController(mixer, clips) {
  /** @type {Record<string, THREE.AnimationAction|null>} */
  const actions = {
    stay: clips.stay ? mixer.clipAction(clips.stay) : null,
    walk: clips.walk ? mixer.clipAction(clips.walk) : null,
    run: clips.run ? mixer.clipAction(clips.run) : null,
    sit: clips.sit ? mixer.clipAction(clips.sit) : null,
    sitHi: clips.sitHi ? mixer.clipAction(clips.sitHi) : null,
    lay: clips.lay ? mixer.clipAction(clips.lay) : null,
  };

  if (actions.stay) {
    if (CONFIG.STAY_LOOP) actions.stay.setLoop(THREE.LoopRepeat, Infinity);
    else {
      actions.stay.setLoop(THREE.LoopOnce, 1);
      actions.stay.clampWhenFinished = true;
    }
  }
  if (actions.walk) actions.walk.setLoop(THREE.LoopRepeat, Infinity);
  if (actions.run) actions.run.setLoop(THREE.LoopRepeat, Infinity);
  if (actions.sit) {
    actions.sit.setLoop(THREE.LoopOnce, 1);
    actions.sit.clampWhenFinished = true;
  }
  if (actions.sitHi) {
    actions.sitHi.setLoop(THREE.LoopOnce, 1);
    actions.sitHi.clampWhenFinished = true;
  }
  if (actions.lay) {
    actions.lay.setLoop(THREE.LoopOnce, 1);
    actions.lay.clampWhenFinished = true;
  }

  /** @type {"none"|"stay"|"walk"|"run"|"sit"|"sitHi"|"lay"} */
  let current = "none";
  /** 앉기/눕기 중이면 이동 애니로 덮지 않음 */
  let postureLocked = false;
  /** @type {"none"|"sit"|"lay"} */
  let postureKind = "none";
  let stayTimer = 0;
  let finishGen = 0;

  /**
   * @param {string} name
   * @param {number} duration
   * @param {{ time?: number, timeScale?: number }} [opts]
   */
  function fadeTo(name, duration = 0.25, opts = {}) {
    const next = actions[name];
    if (!next) {
      console.warn(`[animation] 클립 없음: ${name}`);
      return false;
    }
    for (const [key, action] of Object.entries(actions)) {
      if (!action || key === name) continue;
      if (action.isRunning() || action.getEffectiveWeight() > 0) {
        action.fadeOut(duration);
      }
    }
    next.reset();
    if (opts.timeScale != null) next.timeScale = opts.timeScale;
    else next.timeScale = 1;
    if (opts.time != null) next.time = opts.time;
    next.fadeIn(duration).play();
    current = name;
    return true;
  }

  function onActionFinished(action, cb) {
    const gen = ++finishGen;
    const handler = (e) => {
      if (e.action !== action) return;
      mixer.removeEventListener("finished", handler);
      if (gen !== finishGen) return;
      cb();
    };
    mixer.addEventListener("finished", handler);
  }

  function startIdle() {
    stayTimer = 0;
    postureLocked = false;
    postureKind = "none";
    fadeTo("stay", 0.2);
  }

  function update(dt) {
    if (!CONFIG.STAY_LOOP && current === "stay" && !postureLocked) {
      stayTimer += dt;
      if (actions.stay && stayTimer >= CONFIG.IDLE_STAY_INTERVAL_SEC) {
        stayTimer = 0;
        actions.stay.reset().fadeIn(0.15).play();
      }
    }
  }

  /**
   * @param {"idle"|"walk"|"run"} mode
   */
  function setLocomotion(mode) {
    if (postureLocked) return;
    let target = mode === "run" ? "run" : mode === "walk" ? "walk" : "stay";
    if (target === "run" && !actions.run) target = "walk";
    if (target === "walk" && !actions.walk) target = "stay";
    if (target === current) return;
    if (target === "stay") {
      stayTimer = 0;
      fadeTo("stay", 0.2);
      return;
    }
    fadeTo(target, 0.15);
  }

  /** 의자 앉기: sit 클립 역재생 (클립 끝이 서 있는 포즈) */
  function playSitDown() {
    if (!actions.sit) {
      console.warn("[animation] sit 클립 없음 — 앉기 스킵 (나중에 에셋만 추가하면 됨)");
      return false;
    }
    postureLocked = true;
    postureKind = "sit";
    const clip = actions.sit.getClip();
    fadeTo("sit", 0.12, {
      timeScale: CONFIG.SIT_DOWN_TIMESCALE,
      time: clip.duration,
    });
    return true;
  }

  /** 침대 눕기: lay 정방향 (서 있음 → 누움) */
  function playLay() {
    if (!actions.lay) {
      console.warn("[animation] lay 클립 없음");
      return false;
    }
    postureLocked = true;
    postureKind = "lay";
    fadeTo("lay", 0.12, { timeScale: CONFIG.LAY_DOWN_TIMESCALE, time: 0 });
    return true;
  }

  /** 일어서기: 앉은 상태면 sit 정방향, 누운 상태면 lay 역재생 */
  function playStandUp() {
    if (postureKind === "lay" || current === "lay") {
      return playGetUpFromLay();
    }
    return playGetUpFromSit();
  }

  /**
   * 이미 재생 중인 같은 클립을 방향만 바꿔 이어갈 때 사용.
   * fadeTo(reset+fadeIn)를 쓰면 weight가 0→1로 다시 들어가
   * 누운/앉은 포즈가 한 번 더 찍힌 뒤 일어나는 것처럼 보임.
   */
  function continueAction(action, { timeScale, time }) {
    for (const [, other] of Object.entries(actions)) {
      if (!other || other === action) continue;
      if (other.isRunning() || other.getEffectiveWeight() > 0) {
        other.fadeOut(0.12);
      }
    }
    const keepTime = time != null ? time : action.time;
    action.stopFading();
    action.reset();
    action.timeScale = timeScale;
    action.time = keepTime;
    action.setEffectiveWeight(1);
    action.play();
  }

  function playGetUpFromSit() {
    if (!actions.sit) {
      postureLocked = false;
      postureKind = "none";
      fadeTo("stay", 0.2);
      return false;
    }
    postureLocked = true;
    postureKind = "sit";
    // 앉기 역재생 끝 = time≈0. 정방향으로 일어서기 (fadeIn 금지)
    continueAction(actions.sit, {
      timeScale: CONFIG.STAND_UP_TIMESCALE,
      time: Math.min(actions.sit.time, actions.sit.getClip().duration * 0.02),
    });
    current = "sit";
    onActionFinished(actions.sit, () => {
      postureLocked = false;
      postureKind = "none";
      fadeTo("stay", 0.12);
    });
    return true;
  }

  function playGetUpFromLay() {
    if (!actions.lay) {
      postureLocked = false;
      postureKind = "none";
      fadeTo("stay", 0.12);
      return false;
    }
    postureLocked = true;
    postureKind = "lay";
    const clip = actions.lay.getClip();
    // 이미 누운 포즈(끝 프레임)에서 weight 유지한 채 역재생만
    const t = actions.lay.time > 0.05 ? actions.lay.time : clip.duration;
    continueAction(actions.lay, {
      timeScale: -Math.abs(CONFIG.LAY_STAND_TIMESCALE),
      time: t,
    });
    current = "lay";
    onActionFinished(actions.lay, () => {
      postureLocked = false;
      postureKind = "none";
      fadeTo("stay", 0.12);
    });
    return true;
  }

  /**
   * 일어서기 클립을 끝까지 기다리지 않고 이동/대기로 넘긴다.
   * @param {{ x?: number, y?: number, running?: boolean }|null} intent
   */
  function releaseToLocomotion(intent) {
    finishGen += 1;
    postureLocked = false;
    postureKind = "none";
    const moving = Boolean(intent && (Math.abs(intent.x || 0) > 0.2 || Math.abs(intent.y || 0) > 0.2));
    let name = "stay";
    if (moving && intent?.running && actions.run) name = "run";
    else if (moving && actions.walk) name = "walk";
    fadeTo(name, CONFIG.RISE_FADE_TO_LOCOMOTION);
  }

  /** 앉은 채 인사 (새 유저 입장 훅 — Phase 6) */
  function playSitHi() {
    if (!actions.sitHi) {
      console.warn("[animation] sitHi 클립 없음");
      return false;
    }
    if (!postureLocked && current !== "sit" && current !== "sitHi") {
      console.info("[animation] sitHi는 앉은 상태에서 사용");
    }
    postureLocked = true;
    if (postureKind === "none") postureKind = "sit";
    fadeTo("sitHi", 0.2);
    onActionFinished(actions.sitHi, () => {
      if (actions.sit) fadeTo("sit", 0.3, { time: 0, timeScale: 0 });
    });
    return true;
  }

  return {
    actions,
    get state() {
      return current;
    },
    get isSeated() {
      return postureLocked && postureKind === "sit";
    },
    get isLaid() {
      return postureLocked && postureKind === "lay";
    },
    get isPostureLocked() {
      return postureLocked;
    },
    startIdle,
    startIdlePreview: startIdle,
    fadeTo,
    setLocomotion,
    update,
    playSitDown,
    playStandUp,
    releaseToLocomotion,
    playSitHi,
    playLay,
    clipDuration(name) {
      return actions[name]?.getClip().duration ?? 0;
    },
  };
}
