/**
 * 스터디 카페 snowmap 부트
 */
import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createRenderer } from "./core/renderer.js";
import { applyQuality } from "./core/quality.js";
import { getGraphicsLevel, getGraphicsPreset } from "./core/graphics.js";
import { createLoop } from "./core/loop.js";
import { isMobileDevice } from "./core/device.js";
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
import { createNetAdapter, pickNetMode } from "./net/adapter.js";
import { setTokenRefresher } from "./net/auth.js";
import { getIdentity } from "./net/identity.js";
import {
  leavePresence,
  requestedRoomFromQuery,
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
import { createNotifyBell } from "./ui/notifyBell.js";

const statusEl = document.getElementById("status");
const statusLabel = statusEl?.querySelector(".status-label");
const statusFill = document.getElementById("status-fill");

/**
 * 앱 WebView 안이면 로딩 진행률을 앱에 알린다. 앱은 로딩 카드를 한 장만 그리고(앱 로딩 → 웹 로딩으로
 * 바뀌며 위치가 튀지 않게), 웹 로딩(#status)은 index.html의 .in-app-loader 규칙으로 숨겨져 있다.
 */
function postToApp(type, payload = {}) {
  try {
    if (!window.ReactNativeWebView?.postMessage) return;
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ v: 1, type, id: `${Date.now()}-${type}`, payload }),
    );
  } catch {
    /* ignore */
  }
}

/** 로딩 문구는 단계와 상관없이 하나로 둔다. 단계 이름(label)은 진행률과 함께 앱 로그용으로만 보낸다 */
const LOADING_TEXT = "스터디 카페 입장 중";

function setLoading(progress, label = "불러오는 중") {
  postToApp("cafe:loading", { progress, label });
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.classList.remove("error");
  if (statusLabel) statusLabel.textContent = LOADING_TEXT;
  if (statusFill) {
    const pct = Math.max(0, Math.min(100, Number(progress) || 0));
    statusFill.style.width = `${pct}%`;
  }
}

function hideLoading() {
  // 조이스틱·버튼 등을 이제 보여 준다
  document.body.classList.remove("booting");
  if (!statusEl) return;
  statusEl.hidden = true;
  statusEl.classList.remove("error");
}

function setStatusError(text) {
  // 앱의 로딩 카드를 내리고 웹 오류 화면을 보이게 한다
  postToApp("cafe:error", { message: String(text || "") });
  if (!statusEl) return;
  statusEl.hidden = false;
  statusEl.classList.add("error");
  if (statusLabel) statusLabel.textContent = text;
}

async function boot() {
  setLoading(4, "준비 중");

  const { renderer } = createRenderer(document.body);
  applyQuality(renderer);
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
  const sky = await createSky(scene, {
    onPhase: (phase, initial) => lights.setSkyPhase(phase, initial),
  });
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

  /** 마지막으로 무언가 움직인 시각. 한동안 가만히 있으면 fps를 낮춘다 (발열 줄이기) */
  let lastActiveAt = performance.now();
  function markActive() {
    lastActiveAt = performance.now();
  }
  function targetFps() {
    return performance.now() - lastActiveAt < CONFIG.FPS_IDLE_AFTER_SEC * 1000
      ? CONFIG.FPS_ACTIVE
      : getGraphicsPreset().fpsIdle;
  }

  const me = await getIdentity();
  /** "server": Railway 서버(앱에서 로그인 토큰을 받은 경우) / "mock": 브라우저 개발용 */
  const netMode = pickNetMode();
  const useServer = netMode === "server";
  /**
   * 지금 방. mock은 이 기기 기준으로 고르고, 서버 모드는 원하는 방만 보내고
   * 연결 뒤 서버가 정한 방(net.room)으로 바꾼다.
   * @type {{ id: string, name: string, index: number }|null}
   */
  let cafeRoom = useServer ? requestedRoomFromQuery() : resolveRoomFromQuery(me.userId);
  if (!useServer && cafeRoom) {
    syncRoomQuery(cafeRoom);
    touchPresence(me.userId, cafeRoom.id);
  }
  const net = createNetAdapter(cafeRoom?.id || null, netMode);
  console.info("[study-cafe] net", netMode);
  // 꾹 누르기 메뉴(복사·이미지 저장 등)를 막는다. 입력칸은 그대로 둔다
  document.addEventListener("contextmenu", (e) => {
    const t = /** @type {HTMLElement|null} */ (e.target);
    if (t?.closest?.("input, textarea, [contenteditable='true']")) return;
    e.preventDefault();
  });
  document.addEventListener("selectstart", (e) => {
    const t = /** @type {HTMLElement|null} */ (e.target);
    if (t?.closest?.("input, textarea, [contenteditable='true']")) return;
    e.preventDefault();
  });

  const boardUI = createBoardUI(net, me, {
    onOpenChange: (open) => {
      input.keys.clear();
      // 방명록을 보는 동안 앱의 뒤로가기 버튼(왼쪽 위)을 숨기게 알린다
      postToApp("cafe:board", { open: Boolean(open) });
    },
  });
  const isUiOpen = () =>
    boardUI.isOpen ||
    chat.isOpen ||
    document.getElementById("room-switch")?.classList.contains("open");

  // 앱 안인데 서버 연결이 없으면(mock) 방명록·채팅 입력은 내 폰에만 저장되는 가짜라 숨긴다.
  const socialEnabled = !(
    CONFIG.HIDE_MOCK_SOCIAL_IN_APP &&
    !useServer &&
    window.ReactNativeWebView?.postMessage
  );
  if (!socialEnabled) {
    const chatOpenBtn = document.getElementById("chat-open");
    if (chatOpenBtn) chatOpenBtn.hidden = true;
    console.info("[study-cafe] 방명록·채팅 입력 숨김 (앱 + mock 네트워크)");
  }

  const interact = createInteractables(mapRoot, {
    onOpenBoard: socialEnabled ? (boardId) => boardUI.open(boardId) : null,
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
    // 그림자 맵은 고정이라, 문처럼 맵 물체가 움직일 때만 다시 그린다
    onShadowsDirty: () => {
      renderer.shadowMap.needsUpdate = true;
      markActive();
    },
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
  /** @type {ReturnType<typeof createNotifyBell>|null} */
  let notifyBell = null;
  const chat = createChat({
    net,
    me,
    nameTags,
    canOpen: () => socialEnabled && !boardUI.isOpen && !userRoster?.isOpen,
    onOpenChange: () => input.keys.clear(),
  });

  const pad = createPadControls({
    onInteract: () => interact.tryInteract(),
    peekAction: () => interact.peekAction(),
    onSecondary: () => interact.trySecondary(),
    peekSecondary: () => interact.peekSecondaryAction(),
    setRunHeld: (held) => input.setRunHeld(held),
    isSeated: () =>
      Boolean(interact.isOccupied || anim?.isSeated || anim?.isLaid),
  });

  /** @type {ReturnType<typeof createDeskTimer>|null} */
  let deskTimer = null;
  /** 입장 직후 첫 앱 스냅샷에서만 자동 착석 시도 */
  let entrySeatHandled = false;
  let entrySeatTimer = 0;
  /** 방 연결이 끝난 시각. 그 전에는 다른 사람이 앉은 자리를 아직 모른다 */
  let netReadyAt = Infinity;

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
    // 연결 직후에는 다른 사람 상태(앉은 자리)가 아직 안 왔을 수 있다. 잠깐 기다렸다가 고른다.
    const waited = performance.now() - netReadyAt;
    if (!(waited >= CONFIG.ENTRY_SEAT_WAIT_MS)) {
      const delay = Number.isFinite(waited) ? CONFIG.ENTRY_SEAT_WAIT_MS - waited : 500;
      window.clearTimeout(entrySeatTimer);
      entrySeatTimer = window.setTimeout(() => {
        handleEntryAutoSeat(Boolean(deskTimer?.getState().isRunning));
      }, Math.max(50, delay));
      return;
    }
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
    onAppNotice: (payload) => {
      notifyBell?.push(payload);
    },
  });
  // 서버 토큰이 만료되면 앱에 새 토큰을 받는다
  setTokenRefresher(() => bridge.refreshAuth());

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
    getRoomId: () => cafeRoom?.id || "",
    // 서버 모드: 실제 방 인원 / mock: 이 기기 탭끼리
    listRooms: useServer ? () => net.listRooms() : null,
    canOpen: () => !boardUI.isOpen && !chat.isOpen && !userRoster?.isOpen,
  });

  if (!useServer) {
    const presenceTimer = window.setInterval(() => {
      touchPresence(me.userId, cafeRoom.id);
      roomSwitch.refresh();
    }, 2500);
    window.addEventListener("pagehide", () => {
      leavePresence(me.userId);
      window.clearInterval(presenceTimer);
    });
  } else {
    window.addEventListener("pagehide", () => net.disconnect());
  }

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
    // 서버 모드에서만 신고·차단 (mock은 저장할 곳이 없다)
    moderation: useServer
      ? {
          report: (userId, reason) => net.report(userId, reason),
          block: async (userId, displayName) => {
            const res = await net.block(userId);
            if (res?.ok) {
              remotes.remove(userId, { silent: true });
              chat.system(`${displayName} 님을 차단했어요`);
            }
            return res;
          },
        }
      : null,
    canOpen: () => !boardUI.isOpen && !chat.isOpen,
    onFriendAdd: (user, status) => {
      chat.system(
        status === "already"
          ? `${user.displayName} 님은 이미 친구예요`
          : `${user.displayName} 님에게 친구 요청을 보냈어요`,
      );
    },
  });
  /** 사용자 탭 오른쪽 알림벨 (앱 토스트 대신) */
  notifyBell = createNotifyBell();

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
  await net.connect({ ...me, gender: character?.gender || loadSavedGender() });
  connectedAt.t = performance.now();
  netReadyAt = connectedAt.t;
  if (useServer) {
    // 방과 내 이름은 서버가 정한 값을 쓴다
    if (net.room) {
      cafeRoom = net.room;
      syncRoomQuery(cafeRoom);
    }
    const serverMe = net.me;
    if (serverMe) {
      const prevId = me.userId;
      Object.assign(me, serverMe);
      if (CONFIG.SHOW_MY_NAMETAG) {
        if (prevId !== me.userId) nameTags.remove(prevId);
        nameTags.add(me.userId, {
          name: me.displayName,
          isMe: true,
          getHead: (out) => (character?.head ? character.head.getWorldPosition(out) : null),
        });
      }
    }
    roomSwitch.refresh();

    // 다른 사람이 먼저 앉은 자리면 앉기를 취소한다
    net.onSeatDenied(({ seatId, occupantId } = {}) => {
      if (!seatId) return;
      if (interact.activeSeat?.id === seatId) {
        if (interact.isHeld) interact.standUp();
        else {
          interact.abort();
          anim?.releaseToLocomotion(null);
        }
        chat.system("다른 사람이 먼저 앉은 자리예요");
      }
      // 일어서는 동안은 내 자리로 잡혀 있어 표시를 못 한다. 잠시 뒤 다시 표시
      const mark = () => interact.setSeatOccupant(seatId, occupantId ? String(occupantId) : "other");
      if (!mark()) window.setTimeout(mark, 1500);
    });
    net.onKicked(() => {
      setStatusError("다른 곳에서 스터디 카페에 들어와 연결을 끊었어요");
    });
    net.onChatError?.((code) => {
      if (code === "cooldown") chat.system("조금 천천히 보내 주세요");
      else if (code === "too_long") chat.system("채팅이 너무 길어요");
      else if (code !== "empty") chat.system("채팅을 보내지 못했어요");
    });
  }
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
    } else if (key === "f") {
      interact.trySecondary();
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
      /** 타이머 실행 중이면 다른 사람 화면에서 머리 위에 시계가 뜬다 */
      studying: Boolean(deskTimer?.getState().studying),
      t: Date.now(),
    };
    if (CONFIG.SHOW_MY_NAMETAG) nameTags.setStudying(me.userId, state.studying);
    const now = performance.now();
    const same =
      lastSent &&
      lastSent.x === state.x &&
      lastSent.y === state.y &&
      lastSent.z === state.z &&
      lastSent.yaw === state.yaw &&
      lastSent.anim === state.anim &&
      lastSent.seatId === state.seatId &&
      lastSent.studying === state.studying &&
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

  let uiRefreshAcc = 0;
  const loop = createLoop({
    getMaxFps: targetFps,
    fixedUpdate(dt) {
      if (!character || !anim || !controller) return;
      const t0 = performance.now();
      stepsThisFrame += 1;
      stepStart.copy(character.pivot.position);
      stepStartYaw = character.pivot.rotation.y;

      const raw = isUiOpen() ? null : input.read();
      interact.setMoveIntent(raw);
      // 조작 중이거나 앉기·일어서기 동작 중이면 부드럽게(높은 fps) 그린다
      if (
        (raw && (Math.abs(raw.x) > 0.05 || Math.abs(raw.y) > 0.05)) ||
        anim.state === "walk" ||
        anim.state === "run" ||
        (interact.phase && interact.phase !== "held")
      ) {
        markActive();
      }
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
      lights.update(frameDt);
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
      // 버튼·타이머 패널은 0.1초마다만 확인한다 (매 프레임 DOM을 건드리면 발열·버벅임)
      uiRefreshAcc += frameDt;
      if (uiRefreshAcc >= CONFIG.UI_REFRESH_SEC) {
        uiRefreshAcc = 0;
        pad.refresh();
        deskTimer.refresh();
      }
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

  // 맵·캐릭터가 다 올라온 뒤 그림자를 한 번 그린다 (그 뒤로는 고정)
  renderer.shadowMap.needsUpdate = true;
  loop.start();

  // 화면이 안 보이면(앱 백그라운드·다른 화면) 그리기를 멈춘다
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) loop.stop();
    else {
      markActive();
      loop.start();
    }
  });

  // 성능 확인용 (?debug=perf)
  if (/[?&]debug=perf\b/.test(window.location.search)) {
    window.__cafePerf = {
      renderer,
      scene,
      targetFps,
      mobile: isMobileDevice(),
      graphics: getGraphicsLevel(),
      boardUI,
    };
  }
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
