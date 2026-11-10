import * as THREE from "three";
import { CONFIG } from "../config.js";
import { cloneCharacter } from "../character/loader.js";
import { createAnimationController } from "../character/animation.js";

/**
 * 다른 사람 캐릭터. 받은 위치를 NET_INTERP_DELAY_MS 만큼 늦춰 두 상태 사이를 보간해서 부드럽게 움직인다.
 * 충돌 없음(서로 통과). 앉은 좌석은 interact.setSeatOccupant로 막아서 내가 못 앉게 한다.
 * @param {{
 *   scene: THREE.Scene,
 *   net: import("../net/adapter.js").NetAdapter,
 *   nameTags: ReturnType<import("./nameTags.js").createNameTags>,
 *   interact: { setSeatOccupant: (seatId: string, who: string|null) => boolean },
 *   getTemplate: (gender: "boy"|"girl") => Promise<any>,
 *   onJoin?: (state: import("../net/adapter.js").PlayerState) => void,
 *   onLeave?: (userId: string, displayName: string) => void,
 * }} deps
 */
export function createRemotePlayers(deps) {
  const { scene, net, nameTags, interact } = deps;

  /**
   * @typedef {{ at: number, x: number, y: number, z: number, yaw: number }} Sample
   * @type {Map<string, {
   *   userId: string, displayName: string, gender: string,
   *   char: any, anim: any, samples: Sample[], animName: string, seatId: string|null,
   *   pending: import("../net/adapter.js").PlayerState, building: boolean,
   * }>}
   */
  const players = new Map();

  async function build(player) {
    player.building = true;
    const gender = player.gender;
    try {
      const base = await deps.getTemplate(gender);
      if (!players.has(player.userId) || player.gender !== gender) return;
      if (player.char) scene.remove(player.char.pivot);
      const char = cloneCharacter(base);
      player.char = char;
      player.anim = createAnimationController(char.mixer, char.clips);
      player.anim.startIdle();
      player.animName = "stay";
      scene.add(char.pivot);
      nameTags.add(player.userId, {
        name: player.displayName,
        getHead: (out) => (player.char?.head ? player.char.head.getWorldPosition(out) : null),
      });
    } catch (err) {
      console.error("[remote] 캐릭터 로드 실패", player.userId, err);
    } finally {
      player.building = false;
    }
  }

  function setSeat(player, seatId) {
    if (player.seatId === seatId) return;
    if (player.seatId) interact.setSeatOccupant(player.seatId, null);
    player.seatId = seatId || null;
    if (player.seatId) interact.setSeatOccupant(player.seatId, player.userId);
  }

  function upsert(state) {
    let player = players.get(state.userId);
    if (!player) {
      player = {
        userId: state.userId,
        displayName: state.displayName,
        avatarUrl: state.avatarUrl || null,
        gender: state.gender,
        char: null,
        anim: null,
        samples: [],
        animName: "stay",
        seatId: null,
        pending: state,
        building: false,
      };
      players.set(state.userId, player);
      deps.onJoin?.(state);
      build(player);
    }
    if (state.displayName && state.displayName !== player.displayName) {
      player.displayName = state.displayName;
      nameTags.setName(player.userId, state.displayName);
    }
    if (state.avatarUrl !== undefined) {
      player.avatarUrl = state.avatarUrl || null;
    }
    if (state.gender && state.gender !== player.gender) {
      player.gender = state.gender;
      build(player);
    }
    player.pending = state;
    player.samples.push({ at: performance.now(), x: state.x, y: state.y, z: state.z, yaw: state.yaw });
    if (player.samples.length > 30) player.samples.splice(0, player.samples.length - 30);
    setSeat(player, state.seatId);
  }

  function removePlayer(userId) {
    const player = players.get(userId);
    if (!player) return;
    setSeat(player, null);
    if (player.char) scene.remove(player.char.pivot);
    nameTags.remove(userId);
    players.delete(userId);
    deps.onLeave?.(userId, player.displayName);
  }

  function applyAnim(player, name) {
    if (player.animName === name || !player.anim) return;
    const a = player.anim;
    player.animName = name;
    if (name === "sit" || name === "sitHi") {
      if (!a.isSeated) a.playSitDown();
      if (name === "sitHi") a.playSitHi();
      return;
    }
    if (name === "lay") {
      if (!a.isLaid) a.playLay();
      return;
    }
    if (a.isPostureLocked) {
      if (name === "stay") {
        a.playStandUp();
        return;
      }
      a.releaseToLocomotion({ x: 1, y: 0, running: name === "run" });
    }
    a.setLocomotion(name === "stay" ? "idle" : name);
  }

  function samplePose(player, renderAt, out) {
    const s = player.samples;
    if (s.length === 0) return false;
    let a = s[0];
    let b = s[s.length - 1];
    if (renderAt >= b.at) {
      out.copy(b);
      return true;
    }
    for (let i = s.length - 1; i > 0; i--) {
      if (s[i - 1].at <= renderAt) {
        a = s[i - 1];
        b = s[i];
        break;
      }
    }
    const span = Math.max(b.at - a.at, 1);
    const k = THREE.MathUtils.clamp((renderAt - a.at) / span, 0, 1);
    if (Math.hypot(b.x - a.x, b.z - a.z) > 3) {
      out.copy(b);
      return true;
    }
    out.x = a.x + (b.x - a.x) * k;
    out.y = a.y + (b.y - a.y) * k;
    out.z = a.z + (b.z - a.z) * k;
    const dy = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
    out.yaw = a.yaw + dy * k;
    return true;
  }

  const pose = {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    copy(src) {
      this.x = src.x;
      this.y = src.y;
      this.z = src.z;
      this.yaw = src.yaw;
      return this;
    },
  };

  /** 매 프레임(렌더 직전) */
  function update(dt) {
    const renderAt = performance.now() - CONFIG.NET_INTERP_DELAY_MS;
    for (const player of players.values()) {
      if (!player.char) continue;
      if (samplePose(player, renderAt, pose)) {
        player.char.pivot.position.set(pose.x, pose.y, pose.z);
        player.char.pivot.rotation.y = pose.yaw;
      }
      applyAnim(player, player.pending?.anim || "stay");
      player.anim.update(dt);
      player.char.mixer.update(dt);
    }
  }

  net.onPlayerJoin(upsert);
  net.onPlayerState(upsert);
  net.onPlayerLeave(removePlayer);

  const hitCenter = new THREE.Vector3();
  const hitDelta = new THREE.Vector3();

  /**
   * 화면 클릭으로 상대 캐릭터 고르기.
   * 스키닝 메시 레이캐스트는 잘 안 맞아서, 몸통 근처 구로 판정한다.
   * @param {THREE.Raycaster} raycaster
   */
  function hitTest(raycaster) {
    /** @type {{ dist: number, userId: string, displayName: string, getHead: Function }|null} */
    let best = null;
    const radius = 0.55;
    for (const player of players.values()) {
      if (!player.char?.pivot) continue;
      hitCenter.copy(player.char.pivot.position);
      hitCenter.y += 0.9;
      hitDelta.subVectors(hitCenter, raycaster.ray.origin);
      const along = hitDelta.dot(raycaster.ray.direction);
      if (along < 0.2) continue;
      const distToRay = Math.sqrt(
        Math.max(0, hitDelta.lengthSq() - along * along),
      );
      if (distToRay > radius) continue;
      if (best && along >= best.dist) continue;
      best = {
        dist: along,
        userId: player.userId,
        displayName: player.displayName,
        getHead: (out) =>
          player.char?.head ? player.char.head.getWorldPosition(out) : null,
      };
    }
    if (!best) return null;
    return {
      userId: best.userId,
      displayName: best.displayName,
      getHead: best.getHead,
    };
  }

  return {
    update,
    hitTest,
    /** 로컬 봇·테스트용. 네트워크와 같은 경로로 원격 캐릭터를 넣는다. */
    applyState(state) {
      upsert(state);
    },
    remove(userId) {
      removePlayer(userId);
    },
    get count() {
      return players.size;
    },
    displayNameOf(userId) {
      return players.get(userId)?.displayName ?? null;
    },
    list() {
      return [...players.values()].map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl || null,
        gender: p.gender,
      }));
    },
  };
}
