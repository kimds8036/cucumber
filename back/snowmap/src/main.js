/**
 * 스터디 카페 snowmap 부트
 */
import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createRenderer } from "./core/renderer.js";
import { applyQuality, loadSavedQuality } from "./core/quality.js";
import { createLoop } from "./core/loop.js";
import { createInput, isTyping } from "./core/input.js";
import { loadMap } from "./world/map.js";
import { buildCollisionWorld } from "./world/collision.js";
import { createWorldLights } from "./world/lights.js";
import { createMapLamps } from "./world/mapLamps.js";
import { createPondWater } from "./world/water.js";
import { createSky } from "./world/sky.js";
import { createInteractables } from "./world/interactables.js";
import { createColliderDebug } from "./debug/colliderDebug.js";
import { createSeatDebug } from "./debug/seatDebug.js";
import { loadCharacter } from "./character/loader.js";
import { createAnimationController } from "./character/animation.js";
import { createCharacterController } from "./character/controller.js";
import { loadSavedGender } from "./character/gender.js";
import { createPadControls } from "./ui/padControls.js";
import { createDeskTimer } from "./ui/deskTimer.js";
import { createPerfHud } from "./debug/perfHud.js";
import { createNetAdapter } from "./net/adapter.js";
import { getIdentity } from "./net/identity.js";
import {
  leavePresence,
  resolveRoomFromQuery,
  syncRoomQuery,
  touchPresence,
} from "./net/rooms.js";
import { createBoardUI } from "./social/board.js";
import { createNameTags } from "./social/nameTags.js";
import { createRemotePlayers } from "./social/remotePlayers.js";
import { createChat } from "./social/chat.js";
import { createRoomSwitch } from "./ui/roomSwitch.js";
import { createUserRoster } from "./ui/userRoster.js";
import { createAppBridge } from "./net/appBridge.js";

const statusEl = document.getElementById("status");
const statusLabel = statusEl?.querySelector(".status-label");
const statusFill = document.getElementById("status-fill");

function setLoading(progress, label = "불러오는 중") {
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.classList.remove("error");
  if (statusLabel) statusLabel.textContent = label;
  if (statusFill) {
    const pct = Math.max(0, Math.min(100, Number(progress) || 0));
    statusFill.style.width = `${pct}%`;
  }
}

function hideLoading() {
  if (!statusEl) return;
  statusEl.hidden = true;
  statusEl.classList.remove("error");
}

function setStatusError(text) {
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.classList.add("error");
  if (statusLabel) statusLabel.textContent = text;
}

async function boot() {
  setLoading(4, "준비 중");

  const { renderer } = createRenderer(document.body);
  applyQuality(renderer, loadSavedQuality());
  setLoading(10, "화면 준비");

  const scene = new THREE.Scene();
  const lights = createWorldLights(scene);
  const input = createInput();
  input.bindStick(document.getElementById("stick"), document.getElementById("knob"));

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const camForward = new THREE.Vector3();
  const camRight = new THREE.Vector3();
  function updateMoveAxes() {
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() < 1e-6) camForward.set(0, 0, 1);
    else camForward.normalize();
    camRight.set(-camForward.z, 0, camForward.x);
  }

  setLoading(18, "맵 불러오는 중");
  const { root: mapRoot } = await loadMap(scene);
  setLoading(42, "지형 정리");
  const collisionWorld = buildCollisionWorld(mapRoot);
  const colliderDebug = createColliderDebug(scene, collisionWorld);
  const mapLamps = createMapLamps(mapRoot, scene);
  setLoading(55, "하늘·물");
  const sky = await createSky(scene);
  const water = createPondWater(mapRoot);
  setLoading(62, "상호작용");

  /** @type {Awaited<ReturnType<typeof loadCharacter>>|null} */
  let character = null;
  /** @type {ReturnType<typeof createAnimationController>|null} */
  let anim = null;
  /** @type {ReturnType<typeof createCharacterController>|null} */
  let controller = null;

  const renderPose = {
    prev: new THREE.Vector3(),
    prevYaw: 0,
    curr: new THREE.Vector3(),
    currYaw: 0,
    teleport: true,
  };

  const me = await getIdentity();
  const cafeRoom = resolveRoomFromQuery(me.userId);
  syncRoomQuery(cafeRoom);
  touchPresence(me.userId, cafeRoom.id);
  const net = createNetAdapter(cafeRoom.id);
  const boardUI = createBoardUI(net, me, {
    onOpenChange: () => input.keys.clear(),
  });
  const isUiOpen = () =>
    boardUI.isOpen ||
    chat.isOpen ||
    document.getElementById("room-switch")?.classList.contains("open");

  const interact = createInteractables(mapRoot, {
    onOpenBoard: (boardId) => boardUI.open(boardId),
    getPivot: () => character?.pivot ?? null,
    getAnim: () => anim,
    getCalib: () => character?.poseCalib ?? null,
    getHips: () => character?.hips ?? null,
    getGround: (x, z) => controller?.groundHeight(x, z) ?? null,
    mapLamps,
    isFree: (x, z, y) => {
      if (!controller) return true;
      return controller.canStandAt(x, z, y) && !controller.collidesAt(x, z, y);
    },
    findFreeSpot: (x, z, y) => controller?.findFreeSpot(x, z, y) ?? null,
    markTeleport: () => {
      renderPose.teleport = true;
    },
    onReleasePose: (intent) => anim?.releaseToLocomotion(intent),
  });
  const seatDebug = createSeatDebug(
    scene,
    { seats: interact.seats, getActiveSeat: () => interact.activeSeat },
    { getHips: () => character?.hips ?? null }
  );

  const perfHud = createPerfHud();

  const nameTags = createNameTags(scene, camera);
  /** @type {ReturnType<typeof createUserRoster>|null} */
  let userRoster = null;
  const chat = createChat({
    net,
    me,
    nameTags,
    canOpen: () => !boardUI.isOpen && !userRoster?.isOpen,
    onOpenChange: () => input.keys.clear(),
  });

  const pad = createPadControls({
    onInteract: () => interact.tryInteract(),
    peekAction: () => interact.peekAction(),
    setRunHeld: (held) => input.setRunHeld(held),
    isSeated: () =>
      Boolean(interact.isOccupied || anim?.isSeated || anim?.isLaid),
  });

  /** @type {ReturnType<typeof createDeskTimer>|null} */
  let deskTimer = null;
  /** 입장 직후 첫 앱 스냅샷에서만 자동 착석 시도 */
  let entrySeatHandled = false;

  function pickAutoSeat() {
    const pivot = character?.pivot?.position;
    if (!pivot) return null;
    let best = null;
    let bestDist = Infinity;
    for (const seat of interact.seats) {
      if (!seat || seat.kind === "bed") continue;
      if (seat.occupiedBy && seat.occupiedBy !== me.userId) continue;
      const deskLike =
        seat.desk || /chair|desk|sideTable/i.test(seat.mesh?.name || "");
      if (!deskLike) continue;
      const dx = seat.surface.x - pivot.x;
      const dz = seat.surface.z - pivot.z;
      const d = dx * dx + dz * dz;
      if (d < bestDist) {
        best = seat;
        bestDist = d;
      }
    }
    return best;
  }

  function handleEntryAutoSeat(isRunning) {
    if (entrySeatHandled) return;
    // 스폰 전에 스냅샷이 오면 다음 스냅샷에서 다시 시도
    if (!character?.pivot) return;
    entrySeatHandled = true;
    if (!isRunning) return;
    if (interact.isOccupied) return;
    const seat = pickAutoSeat();
    if (!seat) {
      chat.system("빈 자리가 없어 서서 입장했어요");
      return;
    }
    interact.sitDown(seat);
  }

  const bridge = createAppBridge({
    onTimerSnapshot: (payload) => {
      deskTimer?.applySnapshot(payload);
      deskTimer?.refresh();
      handleEntryAutoSeat(!!payload?.isRunning);
    },
    onTimerResult: (payload) => {
      if (payload?.snapshot) deskTimer?.applySnapshot(payload.snapshot);
      deskTimer?.refresh();
    },
    onFriendList: (payload) => {
      userRoster?.setFriendsFromApp(payload?.friends || []);
    },
    onFriendResult: (payload) => {
      userRoster?.applyFriendResult(payload || {});
    },
  });

  deskTimer = createDeskTimer({
    bridge,
    isAtDesk: () =>
      Boolean(
        interact.isHeld &&
          interact.activeSeat &&
          (interact.activeSeat.desk ||
            /chair|desk|sideTable/i.test(interact.activeSeat.mesh?.name || "")),
      ),
  });

  const roomSwitch = createRoomSwitch({
    getUserId: () => me.userId,
    getRoomId: () => cafeRoom.id,
    canOpen: () => !boardUI.isOpen && !chat.isOpen && !userRoster?.isOpen,
  });

  const presenceTimer = window.setInterval(() => {
    touchPresence(me.userId, cafeRoom.id);
    roomSwitch.refresh();
  }, 2500);
  window.addEventListener("pagehide", () => {
    leavePresence(me.userId);
    window.clearInterval(presenceTimer);
  });

  /** 성별별 원본 캐릭터(다른 사람 캐릭터는 이걸 복제). 내 캐릭터도 여기서 재사용 */
  const templates = new Map();
  function getTemplate(gender) {
    if (!templates.has(gender)) {
      const loading = loadCharacter(gender);
      templates.set(gender, loading);
      loading.catch(() => templates.delete(gender));
    }
    return templates.get(gender);
  }

  const connectedAt = { t: Infinity };
  const remotes = createRemotePlayers({
    scene,
    net,
    nameTags,
    interact,
    getTemplate,
    onJoin: (state) => {
      // 접속 직후 이미 있던 사람들 목록은 입장 메시지 생략
      if (performance.now() - connectedAt.t > 2000) chat.system(`${state.displayName}님이 들어왔어요`);
      userRoster?.refresh();
    },
    onLeave: (_userId, displayName) => {
      chat.system(`${displayName}님이 나갔어요`);
      userRoster?.refresh();
    },
  });

  userRoster = createUserRoster({
    me,
    remotes,
    bridge,
    canOpen: () => !boardUI.isOpen && !chat.isOpen,
    onFriendAdd: (user) => {
      chat.system(`${user.displayName} 님에게 친구 요청을 보냈어요`);
    },
  });

  const pitch = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(CONFIG.CAMERA_PITCH_DEG, CONFIG.CAMERA_PITCH_MIN_DEG, CONFIG.CAMERA_PITCH_MAX_DEG)
  );
  const seatZoomRe = new RegExp(CONFIG.CAMERA_SEAT_ZOOM_PATTERN, "i");
  let dist = CONFIG.CAMERA_DISTANCE;
  let zoom = 1;

  /** 스폰 지점을 덮는 가장 넓은 바닥 메시 = 스폰 섬 */
  const spawnIsland = (() => {
    let best = null;
    let bestArea = 0;
    for (const floor of collisionWorld.floors) {
      const b = floor.box;
      if (!b || CONFIG.SPAWN.x < b.min.x || CONFIG.SPAWN.x > b.max.x || CONFIG.SPAWN.z < b.min.z || CONFIG.SPAWN.z > b.max.z) continue;
      const area = (b.max.x - b.min.x) * (b.max.z - b.min.z);
      if (area > bestArea) {
        best = b;
        bestArea = area;
      }
    }
    return best;
  })();

  function onSpawnIsland(p) {
    if (!spawnIsland) return true;
    return p.x >= spawnIsland.min.x && p.x <= spawnIsland.max.x && p.z >= spawnIsland.min.z && p.z <= spawnIsland.max.z;
  }

  function updateZoom(dt) {
    const seat = interact.activeSeat;
    const seated = seat && interact.phase !== "rise" && interact.phase !== "dismount" && seatZoomRe.test(seat.mesh?.name || "");
    const target = seated
      ? CONFIG.CAMERA_SEAT_ZOOM
      : onSpawnIsland(character.pivot.position)
        ? 1
        : CONFIG.CAMERA_MAIN_ISLAND_ZOOM;
    zoom += (target - zoom) * (1 - Math.exp(-CONFIG.CAMERA_ZOOM_SHARPNESS * dt));
    dist = CONFIG.CAMERA_DISTANCE * zoom;
  }

  function cameraYaw() {
    const fallback = THREE.MathUtils.degToRad(CONFIG.CAMERA_YAW_DEG);
    if (!CONFIG.CAMERA_YAW_FROM_BRIDGE) return fallback;
    let dx = 0;
    let dz = 0;
    let n = 0;
    const box = new THREE.Box3();
    const center = new THREE.Vector3();
    mapRoot.traverse((obj) => {
      if (!obj.isMesh || !/^platform/i.test(obj.name || "")) return;
      box.setFromObject(obj);
      box.getCenter(center);
      if (center.x > -2 || center.z < 2 || center.z > 9.5) return;
      dx += center.x - CONFIG.SPAWN.x;
      dz += center.z - CONFIG.SPAWN.z;
      n += 1;
    });
    if (n < 2) return fallback;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return fallback;
    return Math.atan2(-dx / len, -dz / len);
  }

  const yaw = cameraYaw();
  const look = new THREE.Vector3();

  function placeCamera(alpha = 1) {
    if (!character) return;
    const px = character.pivot.position.x;
    const py = character.pivot.position.y + CONFIG.CAMERA_LOOKAT_HEIGHT;
    const pz = character.pivot.position.z;
    look.set(px, py, pz);
    const desired = new THREE.Vector3(
      px + Math.sin(yaw) * Math.cos(pitch) * dist,
      py + Math.sin(pitch) * dist,
      pz + Math.cos(yaw) * Math.cos(pitch) * dist
    );
    if (alpha >= 1) camera.position.copy(desired);
    else camera.position.lerp(desired, alpha);
    camera.lookAt(look);
    updateMoveAxes();
  }

  async function spawnCharacter(gender, { showLoading = true } = {}) {
    if (showLoading) setLoading(78, "캐릭터 준비");
    if (interact.isOccupied) interact.abort();
    if (character?.pivot) {
      scene.remove(character.pivot);
      character = null;
      anim = null;
      controller = null;
    }

    character = await getTemplate(gender);
    character.mixer.stopAllAction();
    anim = createAnimationController(character.mixer, character.clips);
    controller = createCharacterController(character.pivot, collisionWorld, mapRoot);

    const spawnY = controller.groundHeight(CONFIG.SPAWN.x, CONFIG.SPAWN.z) ?? 0;
    character.pivot.position.set(CONFIG.SPAWN.x, spawnY, CONFIG.SPAWN.z);
    character.pivot.rotation.y = controller.facingYaw();
    renderPose.teleport = true;
    scene.add(character.pivot);
    lights.followKeyTarget(CONFIG.SPAWN.x, spawnY + 1, CONFIG.SPAWN.z);
    anim.startIdle();
    placeCamera();
    mapLamps.warmShaders(renderer, scene, camera);
    console.info("[character] ready", {
      gender,
      clips: Object.fromEntries(
        Object.entries(character.clips).map(([k, v]) => [k, v?.name ?? null])
      ),
    });
  }

  setLoading(72, "캐릭터 준비");
  await spawnCharacter(loadSavedGender(), { showLoading: false });

  if (CONFIG.SHOW_MY_NAMETAG) {
    nameTags.add(me.userId, {
      name: me.displayName,
      isMe: true,
      getHead: (out) => (character?.head ? character.head.getWorldPosition(out) : null),
    });
  }

  setLoading(90, "연결 중");
  await net.connect(me);
  connectedAt.t = performance.now();
  chat.loadHistory();
  setLoading(100, "거의 완료");
  hideLoading();
  bridge.ready();

  window.addEventListener("keydown", (e) => {
    if (!anim || e.repeat || isTyping(e) || isUiOpen()) return;
    const key = e.key.toLowerCase();
    if (key === "e") {
      interact.tryInteract();
      pad.refresh();
    } else if (key === "v") {
      if (anim.isSeated) anim.playSitHi();
    }
  });

  /** 서버로 보낼 내 애니 이름 */
  function localAnimName() {
    const phase = interact.phase;
    const seat = interact.activeSeat;
    if (seat && (phase === "settle" || phase === "held")) {
      if (anim.state === "sitHi") return "sitHi";
      return seat.kind === "bed" ? "lay" : "sit";
    }
    if (phase === "rise" || phase === "dismount") return "stay";
    return anim.state === "walk" || anim.state === "run" ? anim.state : "stay";
  }

  let sendTimer = 0;
  let lastSent = null;
  let lastSentAt = 0;
  function sendLocalState(dt) {
    sendTimer += dt;
    if (sendTimer < 1 / CONFIG.NET_SEND_HZ) return;
    sendTimer = 0;
    const p = character.pivot.position;
    const phase = interact.phase;
    const state = {
      userId: me.userId,
      displayName: me.displayName,
      gender: character.gender,
      x: +p.x.toFixed(3),
      y: +p.y.toFixed(3),
      z: +p.z.toFixed(3),
      yaw: +character.pivot.rotation.y.toFixed(3),
      anim: localAnimName(),
      seatId: phase && phase !== "rise" && phase !== "dismount" ? interact.activeSeat?.id ?? null : null,
      t: Date.now(),
    };
    const now = performance.now();
    const same =
      lastSent &&
      lastSent.x === state.x &&
      lastSent.y === state.y &&
      lastSent.z === state.z &&
      lastSent.yaw === state.yaw &&
      lastSent.anim === state.anim &&
      lastSent.seatId === state.seatId &&
      lastSent.gender === state.gender;
    if (same && now - lastSentAt < 1000) return;
    lastSent = state;
    lastSentAt = now;
    net.sendState(state);
  }

  const stepStart = new THREE.Vector3();
  let stepStartYaw = 0;
  let stepsThisFrame = 0;
  let fixedMs = 0;

  const loop = createLoop({
    fixedUpdate(dt) {
      if (!character || !anim || !controller) return;
      const t0 = performance.now();
      stepsThisFrame += 1;
      stepStart.copy(character.pivot.position);
      stepStartYaw = character.pivot.rotation.y;

      const raw = isUiOpen() ? null : input.read();
      interact.setMoveIntent(raw);
      if (
        interact.isHeld &&
        raw &&
        (Math.abs(raw.x) > 0.2 || Math.abs(raw.y) > 0.2)
      ) {
        interact.standUp();
      }

      const locked = anim.isPostureLocked || interact.isOccupied;
      const move = locked ? null : raw;
      const result = controller.update(dt, move, camForward, camRight, {
        holdPose: interact.isOccupied,
      });

      if (!locked) {
        anim.setLocomotion(result.locomotion === "idle" ? "idle" : result.locomotion);
      }
      anim.update(dt);
      character.mixer.update(dt);
      interact.update(dt);
      sendLocalState(dt);

      const jumped = Math.hypot(
        character.pivot.position.x - stepStart.x,
        character.pivot.position.z - stepStart.z
      ) > 1.25;
      if (renderPose.teleport || jumped) {
        renderPose.prev.copy(character.pivot.position);
        renderPose.prevYaw = character.pivot.rotation.y;
        renderPose.teleport = false;
      } else {
        renderPose.prev.copy(stepStart);
        renderPose.prevYaw = stepStartYaw;
      }
      fixedMs += performance.now() - t0;
    },
    frameUpdate(alpha, frameDt) {
      water.update(frameDt);
      sky.update(frameDt);
      remotes.update(frameDt);
      if (character) {
        const pivot = character.pivot;
        renderPose.curr.copy(pivot.position);
        renderPose.currYaw = pivot.rotation.y;
        pivot.position.lerpVectors(renderPose.prev, renderPose.curr, alpha);
        const dy = Math.atan2(
          Math.sin(renderPose.currYaw - renderPose.prevYaw),
          Math.cos(renderPose.currYaw - renderPose.prevYaw)
        );
        pivot.rotation.y = renderPose.prevYaw + dy * alpha;
        updateZoom(frameDt);
        placeCamera(1 - Math.exp(-CONFIG.CAMERA_FOLLOW_SHARPNESS * frameDt));
        lights.followKeyTarget(pivot.position.x, pivot.position.y + 1, pivot.position.z);
        renderer.render(scene, camera);
        nameTags.render();
        pivot.position.copy(renderPose.curr);
        pivot.rotation.y = renderPose.currYaw;
      } else {
        renderer.render(scene, camera);
        nameTags.render();
      }
      pad.refresh();
      deskTimer.refresh();
      seatDebug.refresh();
      colliderDebug.refresh();
      perfHud.frame(frameDt, {
        fixedMs,
        steps: stepsThisFrame,
        raycasts: collisionWorld.stats?.raycasts ?? 0,
        calls: renderer.info.render.calls,
      });
      if (collisionWorld.stats) collisionWorld.stats.raycasts = 0;
      stepsThisFrame = 0;
      fixedMs = 0;
    },
  });

  loop.start();
  console.info("[study-cafe] ready", {
    seats: interact.seats.length,
    doors: interact.doors.length,
    lamps: mapLamps.lamps.length,
  });
}

boot().catch((err) => {
  console.error("[boot]", err);
  setStatusError(`불러오지 못했어요: ${err?.message || err}`);
});
