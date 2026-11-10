import * as THREE from "three";
import { CONFIG } from "../config.js";
import { makeExtrudedOutline } from "./outline.js";
import { collectDeskGroups } from "./collision.js";

/**
 * 좌석(의자/벤치/침대) + 문 상호작용.
 * 앉는 위치는 캐릭터 poseCalib(골반/몸 중심)과 좌석 표면 레이캐스트로 맞춘다.
 */

const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

function isSeatName(name) {
  return /chair|bench|bed/i.test(name || "");
}

function rotateXZ(offset, yaw) {
  const x = offset?.x || 0;
  const z = offset?.z || 0;
  return {
    x: x * Math.cos(yaw) + z * Math.sin(yaw),
    z: -x * Math.sin(yaw) + z * Math.cos(yaw),
  };
}

function smoothstep(t) {
  const k = THREE.MathUtils.clamp(t, 0, 1);
  return k * k * (3 - 2 * k);
}

/**
 * @param {THREE.Object3D} mapRoot
 * @param {{
 *   getPivot: () => THREE.Object3D|null,
 *   getAnim: () => any,
 *   getCalib: () => any,
 *   getGround: (x: number, z: number) => number|null,
 *   mapLamps: ReturnType<import("./mapLamps.js").createMapLamps>,
 *   canStandAt?: (x: number, z: number, fromY: number) => boolean,
 * }} ctx
 */
export function createInteractables(mapRoot, ctx) {
  /** @type {Array<any>} */
  const seats = [];
  /** @type {Array<any>} */
  const doors = [];

  /** @type {any} */
  let activeSeat = null;
  /** @type {"align"|"settle"|"held"|"rise"|"dismount"|null} */
  let phase = null;
  let released = false;
  /** @type {any} */
  let motion = null;
  /** @type {any} */
  let glowing = null;
  /** @type {any} */
  let nearbyDoor = null;
  /** @type {{ x: number, y: number, running?: boolean }|null} */
  let moveIntent = null;

  mapRoot.updateMatrixWorld(true);
  mapRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (isSeatName(child.name)) registerSeat(child);
  });
  linkDeskSeats();
  registerDoors(mapRoot);
  /** @type {{ id: string, x: number, z: number, range: number, edges: { visible: boolean } }[]} */
  const boards = registerBoards(mapRoot);

  /** 게시판: 같은 이름 뿌리(ParkInfoBoard001_1, _2 …)를 하나로 묶는다 */
  function registerBoards(root) {
    const re = new RegExp(CONFIG.BOARD_PATTERN, "i");
    /** @type {Map<string, THREE.Mesh[]>} */
    const groups = new Map();
    root.traverse((obj) => {
      if (!obj.isMesh || !re.test(obj.name || "")) return;
      const id = obj.name.replace(/_\d+$/, "");
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(obj);
    });
    const list = [];
    for (const [id, meshes] of groups) {
      const box = new THREE.Box3();
      for (const m of meshes) box.expandByObject(m);
      const center = box.getCenter(new THREE.Vector3());
      const outlines = meshes.map((m) => makeExtrudedOutline(m, CONFIG.OUTLINE_COLOR)).filter(Boolean);
      list.push({
        id,
        x: center.x,
        z: center.z,
        range: CONFIG.BOARD_INTERACT_RANGE,
        edges: {
          set visible(v) {
            for (const e of outlines) e.visible = v;
          },
        },
      });
    }
    return list;
  }

  function nearestBoard(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const board of boards) {
      const dist = Math.hypot(board.x - x, board.z - z);
      if (dist <= board.range && dist < bestDist) {
        best = board;
        bestDist = dist;
      }
    }
    return best;
  }

  /** 책상에 붙은 의자: 책상 앞(의자 반대편)에서 앉고, 일어나면 거기로 돌아온다 */
  function linkDeskSeats() {
    const exitT = (p, d, min, max) => (Math.abs(d) < 1e-4 ? Infinity : ((d > 0 ? max : min) - p) / d);
    for (const group of collectDeskGroups(mapRoot)) {
      const { min, max } = group.box;
      for (const seat of seats) {
        if (!group.chairs.includes(seat.mesh)) continue;
        // 의자가 바라보는 방향(책상 쪽)으로 책상 막힘 상자를 가로질러 반대편에 선다
        const dx = Math.sin(seat.yaw);
        const dz = Math.cos(seat.yaw);
        const t = Math.min(
          exitT(seat.surface.x, dx, min.x, max.x),
          exitT(seat.surface.z, dz, min.z, max.z)
        ) + CONFIG.DESK_EXIT_MARGIN;
        const exit = { x: seat.surface.x + dx * t, z: seat.surface.z + dz * t };
        seat.desk = { exit, top: group.deskBox.max.y };
        seat.front = exit;
        seat.interactRange = CONFIG.DESK_INTERACT_RANGE;
        seat.range = CONFIG.DESK_INTERACT_RANGE;
      }
    }
  }

  function surfaceYAt(mesh, x, z, fallback) {
    const top = new THREE.Box3().setFromObject(mesh).max.y;
    raycaster.set(new THREE.Vector3(x, top + 1.5, z), down);
    const hits = raycaster.intersectObject(mesh, false);
    for (const hit of hits) {
      if (!hit.face) return hit.point.y;
      const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
      if (normal.y >= 0.45) return hit.point.y;
    }
    return fallback;
  }

  function registerSeat(child) {
    const kind = /bed/i.test(child.name) ? "bed" : "seat";
    const bench = /bench/i.test(child.name);
    const footprint = new THREE.Box3().setFromObject(child);
    const meshCenter = footprint.getCenter(new THREE.Vector3());
    const meshArea = Math.max(
      0.0001,
      (footprint.max.x - footprint.min.x) * (footprint.max.z - footprint.min.z)
    );
    // 침대는 매트리스/프레임이 겹친 메시로 쪼개져 있다. 가장 넓은 것만 슬롯을 만든다.
    if (kind === "bed") {
      const prev = seats.find(
        (seat) => seat.kind === "bed" && Math.hypot(seat.meshCenter.x - meshCenter.x, seat.meshCenter.z - meshCenter.z) < 0.55
      );
      if (prev && prev.meshArea >= meshArea) return;
      if (prev) {
        for (let i = seats.length - 1; i >= 0; i--) {
          if (seats[i].mesh === prev.mesh) seats.splice(i, 1);
        }
      }
    }
    const yaw = new THREE.Euler().setFromQuaternion(
      child.getWorldQuaternion(new THREE.Quaternion()),
      "YXZ"
    ).y;
    const edges = makeExtrudedOutline(child, CONFIG.OUTLINE_COLOR);
    child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    const localSize = bounds.getSize(new THREE.Vector3());
    const localCenter = bounds.getCenter(new THREE.Vector3());
    const worldScale = child.getWorldScale(new THREE.Vector3());
    const longIsX = localSize.x >= localSize.z;
    const slotCount = kind === "bed"
      ? Math.max(1, CONFIG.BED_SLOTS | 0)
      : bench
        ? Math.max(1, CONFIG.BENCH_SLOTS | 0)
        : 1;
    const longLocal = longIsX ? localSize.x : localSize.z;
    const shortLocal = longIsX ? localSize.z : localSize.x;
    const zScale = Math.abs(worldScale.z) || 1;

    for (let i = 0; i < slotCount; i++) {
      const t = slotCount === 1 ? 0 : i / (slotCount - 1) - 0.5;
      const local = localCenter.clone();
      if (kind === "bed") {
        const side = t * 2 * shortLocal * CONFIG.BED_SLOT_SIDE_FACTOR;
        if (longIsX) local.z += side;
        else local.x += side;
      } else if (bench) {
        const along = t * longLocal * CONFIG.BENCH_SLOT_SPREAD;
        if (longIsX) local.x += along;
        else local.z += along;
      }
      // 등받이/머리판은 로컬 -Z. 레이는 앉는 면(+Z)을 맞춘다.
      local.z += localSize.z * (kind === "bed" ? 0.05 : 0.15);
      const world = child.localToWorld(local.clone());
      const box = new THREE.Box3().setFromObject(child);
      const surface = {
        x: world.x,
        y: surfaceYAt(child, world.x, world.z, box.min.y + box.getSize(new THREE.Vector3()).y * 0.4),
        z: world.z,
      };

      let front = { x: surface.x, z: surface.z };
      let interactRange = 0.75;
      if (kind === "bed") {
        const shortWorld = shortLocal * Math.abs(longIsX ? worldScale.z : worldScale.x);
        interactRange = shortWorld * 0.5 + 0.35;
      } else {
        const frontLocal = local.clone();
        frontLocal.z = localCenter.z + localSize.z * 0.5 + 0.25 / zScale;
        const frontWorld = child.localToWorld(frontLocal);
        front = { x: frontWorld.x, z: frontWorld.z };
        interactRange = surface.y >= CONFIG.HILL_SEAT_MIN_Y
          ? CONFIG.SEAT_INTERACT_RANGE_HILL
          : CONFIG.SEAT_INTERACT_RANGE;
      }

      seats.push({
        id: `${child.name}#${i}`,
        mesh: child,
        kind,
        yaw,
        surface,
        front,
        interactRange,
        range: interactRange,
        edges,
        occupiedBy: null,
        meshCenter: { x: meshCenter.x, z: meshCenter.z },
        meshArea,
      });
    }
  }

  /**
   * 사용자가 분리한 door* 에셋만 (cabin-door* 제외).
   * 문짝 원점이 경첩 모서리이므로 문짝 자체를 회전한다. 벽(부모)은 그대로.
   */
  function registerDoors(root) {
    const doorRe = new RegExp(CONFIG.DOOR_NAME_RE || "^door", "i");
    const leaves = [];
    root.traverse((obj) => {
      const name = obj.name || "";
      if (/^cabin-door/i.test(name)) return;
      if (!obj.isMesh) return;
      if (doorRe.test(name)) leaves.push(obj);
    });

    for (const leaf of leaves) {
      if (leaf.geometry) {
        leaf.geometry.computeBoundingBox();
        const minX = leaf.geometry.boundingBox?.min.x ?? 0;
        if (Math.abs(minX) > 0.02) {
          console.warn("[interact] 문짝 원점이 경첩에서 벗어남 — 회전축이 어긋날 수 있음", leaf.name, minX);
        }
      }
      const center = new THREE.Box3().setFromObject(leaf).getCenter(new THREE.Vector3());
      const existing = doors.find((door) => Math.hypot(door.x - center.x, door.z - center.z) < 0.45);
      if (existing) {
        if (!existing.hinges.includes(leaf)) existing.hinges.push(leaf);
        existing.leaves.push(leaf);
        continue;
      }
      const closedAngle = leaf.rotation.y;
      const sign = CONFIG.DOOR_OPEN_SIGN || -1;
      doors.push({
        hinges: [leaf],
        leaves: [leaf],
        name: leaf.name,
        x: center.x,
        y: center.y,
        z: center.z,
        range: CONFIG.DOOR_INTERACT_RANGE,
        open: false,
        closedAngle,
        openAngle: closedAngle + sign * CONFIG.DOOR_OPEN_ANGLE,
        angle: closedAngle,
        targetAngle: closedAngle,
      });
    }
  }

  /** 골반(의자) 또는 몸 중심(침대)이 좌석 표면에 오도록 피벗 위치를 계산 */
  function anchorFor(seat) {
    const calib = ctx.getCalib?.() || null;
    const pose = seat.kind === "bed" ? calib?.lay : calib?.sit;
    const offset = seat.kind === "bed" ? pose?.bodyOffset : pose?.hipsOffset;
    const rotated = rotateXZ(offset, seat.yaw);
    const clearance = seat.kind === "bed" ? CONFIG.BED_BODY_CLEARANCE : CONFIG.SEAT_HIP_CLEARANCE;
    // 침대 헤드는 로컬 -Z. 발치(+Z, 좌석 yaw 방향)로 밀어 머리가 헤드에 닿지 않게 한다
    const foot = seat.kind === "bed" ? CONFIG.BED_FOOT_SHIFT : 0;
    return {
      x: seat.surface.x - rotated.x + Math.sin(seat.yaw) * foot,
      y: seat.surface.y - (pose?.hipsY || 0) + clearance,
      z: seat.surface.z - rotated.z + Math.cos(seat.yaw) * foot,
      yaw: seat.yaw,
    };
  }

  function approachFor(anchor, entry) {
    const yaw = anchor.yaw;
    const dists = [
      CONFIG.SEAT_APPROACH_DISTANCE,
      CONFIG.SEAT_APPROACH_DISTANCE + 0.15,
      CONFIG.SEAT_APPROACH_DISTANCE + 0.3,
    ];
    let best = null;
    let bestDist = Infinity;
    for (const dist of dists) {
      for (let i = 0; i < 8; i++) {
        const a = yaw + (i * Math.PI) / 4;
        const x = anchor.x + Math.sin(a) * dist;
        const z = anchor.z + Math.cos(a) * dist;
        const y = ctx.getGround?.(x, z);
        if (y == null) continue;
        if (ctx.isFree && !ctx.isFree(x, z, y)) continue;
        const d = entry ? Math.hypot(x - entry.x, z - entry.z) : dist;
        if (d < bestDist) {
          best = { x, y, z };
          bestDist = d;
        }
      }
    }
    if (best) return best;
    if (entry) return { x: entry.x, y: entry.y, z: entry.z };
    return {
      x: anchor.x + Math.sin(yaw) * CONFIG.SEAT_APPROACH_DISTANCE,
      y: ctx.getGround?.(anchor.x, anchor.z) ?? anchor.y,
      z: anchor.z + Math.cos(yaw) * CONFIG.SEAT_APPROACH_DISTANCE,
    };
  }

  function clearGlow() {
    if (!glowing) return;
    if (glowing.edges) glowing.edges.visible = false;
    glowing = null;
  }

  function setGlow(target) {
    if (activeSeat) {
      clearGlow();
      return;
    }
    if (glowing && glowing !== target) clearGlow();
    glowing = target || null;
    if (target?.edges) target.edges.visible = true;
  }

  function nearestSeat(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const seat of seats) {
      if (seat.occupiedBy) continue;
      const point = seat.front || seat.surface;
      const dist = Math.hypot(point.x - x, point.z - z);
      const reach = seat.interactRange ?? seat.range;
      if (dist <= reach && dist < bestDist) {
        best = seat;
        bestDist = dist;
      }
    }
    return best;
  }

  function nearestDoor(x, z) {
    let best = null;
    let bestDist = Infinity;
    for (const door of doors) {
      const dist = Math.hypot(door.x - x, door.z - z);
      if (dist <= door.range && dist < bestDist) {
        best = door;
        bestDist = dist;
      }
    }
    return best;
  }

  function toggleDoor(door) {
    door.open = !door.open;
    door.targetAngle = door.open ? door.openAngle : door.closedAngle;
  }

  function updateDoorAnimations(dt) {
    for (const door of doors) {
      door.angle = THREE.MathUtils.damp(door.angle, door.targetAngle, CONFIG.DOOR_ANIM_SPEED, dt);
      for (const hinge of door.hinges) hinge.rotation.y = door.angle;
    }
  }

  function startMotion(from, to, yaw, duration) {
    const pivot = ctx.getPivot();
    motion = {
      from: { x: from.x, y: from.y, z: from.z },
      to: { x: to.x, y: to.y, z: to.z },
      fromYaw: pivot ? pivot.rotation.y : yaw,
      yaw,
      duration: Math.max(duration, 0.05),
      elapsed: 0,
    };
  }

  function applyMotion() {
    const pivot = ctx.getPivot();
    if (!pivot || !motion) return 1;
    const k = smoothstep(motion.elapsed / motion.duration);
    const lift = motion.arc ? motion.arc * Math.sqrt(Math.sin(Math.PI * k)) : 0;
    pivot.position.set(
      THREE.MathUtils.lerp(motion.from.x, motion.to.x, k),
      THREE.MathUtils.lerp(motion.from.y, motion.to.y, k) + lift,
      THREE.MathUtils.lerp(motion.from.z, motion.to.z, k)
    );
    const dy = Math.atan2(Math.sin(motion.yaw - motion.fromYaw), Math.cos(motion.yaw - motion.fromYaw));
    pivot.rotation.y = motion.fromYaw + dy * k;
    return k;
  }

  function snap(point, yaw) {
    const pivot = ctx.getPivot();
    if (!pivot || !point) return;
    pivot.position.set(point.x, point.y, point.z);
    if (yaw != null) pivot.rotation.y = yaw;
  }

  function sitDown(seat) {
    const pivot = ctx.getPivot();
    const anim = ctx.getAnim();
    if (!pivot || !anim || phase) return false;
    if (seat.kind === "bed" ? !anim.clipDuration("lay") : !anim.clipDuration("sit")) {
      console.warn("[interact] 앉기/눕기 애니 없음 — 좌석 스킵");
      return false;
    }
    clearGlow();
    activeSeat = seat;
    seat.occupiedBy = "local";
    const anchor = anchorFor(seat);
    const entry = { x: pivot.position.x, y: pivot.position.y, z: pivot.position.z };
    const approach = seat.desk
      ? { x: anchor.x, y: ctx.getGround?.(anchor.x, anchor.z) ?? entry.y, z: anchor.z }
      : approachFor(anchor, entry);
    activeSeat.anchor = anchor;
    activeSeat.approach = approach;
    released = false;
    phase = "align";
    if (seat.kind === "bed") {
      // 침대는 매트리스 위에 먼저 올라선 뒤 그 자리에서 눕는다.
      seat.mount = { x: anchor.x, y: seat.surface.y, z: anchor.z };
      startMotion(pivot.position, seat.mount, seat.yaw, CONFIG.BED_MOUNT_TIME);
    } else if (seat.desk) {
      startMotion(pivot.position, approach, seat.yaw, CONFIG.DESK_HOP_TIME);
      motion.arc = Math.max(0, seat.desk.top + CONFIG.DESK_HOP_CLEARANCE - (entry.y + approach.y) * 0.5);
    } else {
      startMotion(pivot.position, approach, seat.yaw, CONFIG.SEAT_ALIGN_TIME);
    }
    return true;
  }

  function beginSettle() {
    const anim = ctx.getAnim();
    const seat = activeSeat;
    if (!anim || !seat) return;
    const bed = seat.kind === "bed";
    const started = bed ? anim.playLay() : anim.playSitDown();
    if (!started) {
      abort();
      return;
    }
    const speed = Math.abs(bed ? CONFIG.LAY_DOWN_TIMESCALE : CONFIG.SIT_DOWN_TIMESCALE) || 1;
    const duration = anim.clipDuration(bed ? "lay" : "sit") / speed;
    phase = "settle";
    startMotion(bed ? seat.mount : seat.approach, seat.anchor, seat.yaw, duration);
    ctx.mapLamps.onSeated(seat.surface.x, seat.surface.z);
  }

  function exitPoint(seat) {
    if (seat.desk) {
      const { x, z } = seat.desk.exit;
      const y = ctx.getGround?.(x, z) ?? seat.approach.y;
      return ctx.findFreeSpot?.(x, z, y) || { x, y, z };
    }
    const approach = seat.approach;
    const free = ctx.findFreeSpot?.(approach.x, approach.z, approach.y);
    return free || approach;
  }

  function releasePose() {
    if (released) return;
    released = true;
    ctx.onReleasePose?.(moveIntent);
  }

  /** 침대: 매트리스 위에서 일어선 뒤 옆으로 내려온다 */
  function beginDismount() {
    const pivot = ctx.getPivot();
    const seat = activeSeat;
    if (!pivot || !seat) return;
    releasePose();
    phase = "dismount";
    startMotion(pivot.position, exitPoint(seat), seat.yaw, CONFIG.BED_DISMOUNT_TIME);
  }

  function finishRise() {
    const seat = activeSeat;
    if (!seat) return;
    if (seat.kind === "bed" && phase === "rise") {
      beginDismount();
      return;
    }
    snap(phase === "dismount" && motion ? motion.to : exitPoint(seat), seat.yaw);
    ctx.markTeleport?.();
    ctx.mapLamps.onStoodUp();
    seat.occupiedBy = null;
    phase = null;
    motion = null;
    activeSeat = null;
    releasePose();
  }

  function standUp() {
    const pivot = ctx.getPivot();
    const anim = ctx.getAnim();
    if (!pivot || !anim || !activeSeat || phase !== "held") return false;
    const seat = activeSeat;
    const bed = seat.kind === "bed";
    anim.playStandUp();
    const speed = Math.abs(bed ? CONFIG.LAY_STAND_TIMESCALE : CONFIG.STAND_UP_TIMESCALE) || 1;
    const duration = anim.clipDuration(bed ? "lay" : "sit") / speed;
    phase = "rise";
    released = false;
    startMotion(pivot.position, bed ? seat.mount : seat.approach, seat.yaw, duration);
    return true;
  }

  /**
   * 다른 유저(멀티) 점유 반영. who=null이면 비움.
   * @param {string} seatId
   * @param {string|null} who
   */
  function setSeatOccupant(seatId, who) {
    const seat = seats.find((s) => s.id === seatId);
    if (!seat || seat === activeSeat) return false;
    seat.occupiedBy = who;
    return true;
  }

  /** 성별 교체 등, 애니 없이 좌석 점유만 해제 */
  function abort() {
    if (activeSeat) activeSeat.occupiedBy = null;
    phase = null;
    motion = null;
    activeSeat = null;
    ctx.mapLamps.onStoodUp();
  }

  function setMoveIntent(raw) {
    moveIntent = raw;
  }

  function tryInteract() {
    const pivot = ctx.getPivot();
    if (!pivot || (phase && phase !== "held")) return;
    if (phase === "held") {
      standUp();
      return;
    }
    const seat = nearestSeat(pivot.position.x, pivot.position.z);
    if (seat) {
      sitDown(seat);
      return;
    }
    const board = nearestBoard(pivot.position.x, pivot.position.z);
    if (board) {
      ctx.onOpenBoard?.(board.id);
      return;
    }
    const door = nearestDoor(pivot.position.x, pivot.position.z);
    if (door) {
      toggleDoor(door);
      return;
    }
    const lamp = ctx.mapLamps.nearestLamp(pivot.position.x, pivot.position.z, { excludeDesk: true });
    if (lamp) ctx.mapLamps.toggleLamp(lamp);
  }

  function logSeatError() {
    const hips = ctx.getHips?.();
    const seat = activeSeat;
    if (!hips || !seat) return;
    const pos = hips.getWorldPosition(new THREE.Vector3());
    const target = seat.kind === "bed" ? seat.anchor : seat.surface;
    const error = Math.hypot(pos.x - seat.surface.x, pos.z - seat.surface.z);
    console.info("[seat-debug]", {
      kind: seat.kind,
      hips: { x: +pos.x.toFixed(3), y: +pos.y.toFixed(3), z: +pos.z.toFixed(3) },
      surface: seat.surface,
      anchorY: +seat.anchor.y.toFixed(3),
      xzErrorM: +error.toFixed(3),
      note: target ? "골반 XZ가 좌석 표면과 5cm 이내면 정상" : "",
    });
  }

  function update(dt) {
    updateDoorAnimations(dt);
    const pivot = ctx.getPivot();
    if (!pivot) {
      clearGlow();
      nearbyDoor = null;
      return;
    }

    if (phase && motion) {
      motion.elapsed += dt;
      const k = applyMotion();
      if (k >= 1) {
        if (phase === "align") beginSettle();
        else if (phase === "settle") {
          phase = "held";
          motion = null;
          snap(activeSeat.anchor, activeSeat.yaw);
          logSeatError();
        } else if (phase === "rise" || phase === "dismount") {
          finishRise();
        }
      } else if (phase === "rise" && k >= (CONFIG.RISE_RELEASE_AT ?? 0.8)) {
        finishRise();
      }
      clearGlow();
      nearbyDoor = null;
      return;
    }

    if (phase === "held" && activeSeat) {
      snap(activeSeat.anchor, activeSeat.yaw);
      clearGlow();
      nearbyDoor = null;
      return;
    }

    setGlow(nearestSeat(pivot.position.x, pivot.position.z) || nearestBoard(pivot.position.x, pivot.position.z));
    nearbyDoor = nearestDoor(pivot.position.x, pivot.position.z);
  }

  console.info("[interactables]", {
    seats: seats.length,
    doors: doors.length,
    doorNames: doors.map((door) => door.name),
    beds: seats.filter((seat) => seat.kind === "bed").length,
  });

  return {
    seats,
    doors,
    boards,
    nearestBoard,
    get activeSeat() {
      return activeSeat;
    },
    get nearbyDoor() {
      return nearbyDoor;
    },
    get isOccupied() {
      return phase !== null;
    },
    get isHeld() {
      return phase === "held";
    },
    get phase() {
      return phase;
    },
    setMoveIntent,
    setSeatOccupant,
    tryInteract,
    sitDown,
    standUp,
    abort,
    toggleDoor,
    nearestSeat,
    nearestDoor,
    update,
    clearGlow,
  };
}
