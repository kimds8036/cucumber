import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { CONFIG } from "../config.js";
import { prepareCharacterMaterials } from "./materials.js";

const fbxLoader = new FBXLoader();

/**
 * @param {string} url
 * @returns {Promise<THREE.Group>}
 */
async function loadFbx(url) {
  try {
    return await fbxLoader.loadAsync(url);
  } catch (err) {
    console.error(`[character] FBX 로드 실패: ${url}`, err);
    throw new Error(`캐릭터 FBX 로드 실패: ${url}`);
  }
}

function pickClip(fbx, patterns = []) {
  const clips = fbx.animations || [];
  for (const pattern of patterns) {
    const found = clips.find((c) => pattern.test(c.name));
    if (found) return found;
  }
  return clips[0] || null;
}

function findBone(root, pattern) {
  let found = null;
  root.traverse((obj) => {
    if (!found && obj.isBone && pattern.test(obj.name || "")) found = obj;
  });
  return found;
}

function hipsPositionTrack(clip) {
  return clip?.tracks.find((track) => /hips\.position$/i.test(track.name)) ?? null;
}

/** 트랙 time 위치의 Hips XZ (키프레임 사이는 앞 키) */
function hipsXZAt(clip, time) {
  const track = hipsPositionTrack(clip);
  if (!track || track.values.length < 3) return null;
  let index = 0;
  while (index < track.times.length - 1 && track.times[index + 1] <= time) index += 1;
  return { x: track.values[index * 3], z: track.values[index * 3 + 2], name: track.name };
}

/**
 * 루트 이동은 제거하고 Hips.position 만 남긴다.
 * 수평 XZ는 stay t=0 값으로 고정해서 클립마다 기준이 달라지지 않게 한다.
 * 세로 Y는 기본적으로 유지한다(앉기/눕기에서 골반이 내려가야 함).
 * lockDriftY: 걷기/달리기에서 Y가 한 방향으로 크게 흘러가면(여자 런 클립) 그 기울기만 빼서
 * 루프 때 이전 위치로 튕기지 않게 한다. 작은 상하 흔들림은 남긴다.
 */
function pinHips(clip, ref, { lockDriftY = false } = {}) {
  if (!clip) return null;
  const pinned = clip.clone();
  pinned.tracks = pinned.tracks.filter(
    (track) => !/\.position$/i.test(track.name) || /hips\.position$/i.test(track.name)
  );
  let hips = hipsPositionTrack(pinned);
  if (!hips && ref) {
    hips = new THREE.VectorKeyframeTrack(ref.name, [0], [ref.x, 0, ref.z]);
    pinned.tracks.push(hips);
  }
  if (hips && ref) {
    const y0 = hips.values[1];
    const y1 = hips.values[hips.values.length - 2];
    const t0 = hips.times[0] ?? 0;
    const t1 = hips.times[hips.times.length - 1] ?? t0;
    // 남자 런의 상하 바운스(약 2)는 두고, 한 클립에 수십 유닛 떠오르는 경우만 제거
    const removeDrift = lockDriftY && Math.abs(y1 - y0) > 8 && t1 > t0;
    for (let i = 0; i < hips.values.length; i += 3) {
      hips.values[i] = ref.x;
      if (removeDrift) {
        const t = hips.times[i / 3] ?? t0;
        const ramp = y0 + (y1 - y0) * ((t - t0) / (t1 - t0));
        hips.values[i + 1] = y0 + (hips.values[i + 1] - ramp);
      }
      hips.values[i + 2] = ref.z;
    }
  }
  return pinned;
}

function applyClip(root, clip, time) {
  // stop()은 적용한 포즈를 바인드 자세로 되돌리므로 호출하지 않는다.
  // 클립 길이와 같은 시각은 LoopRepeat에서 0프레임으로 되감겨, 끝 프레임을 쓴다.
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  const end = Math.max(0, clip.duration - 1e-4);
  mixer.setTime(THREE.MathUtils.clamp(time, 0, end));
  root.updateMatrixWorld(true);
  return mixer;
}

/**
 * @param {THREE.Object3D} root
 * @param {THREE.AnimationClip} clip
 * @param {number} time
 * @param {THREE.Bone} hips
 * @param {THREE.Bone} head
 * @param {THREE.Bone[]} feet
 */
function samplePose(root, clip, time, hips, head, feet) {
  applyClip(root, clip, time);
  const hipsPos = hips.getWorldPosition(new THREE.Vector3());
  const headPos = head.getWorldPosition(new THREE.Vector3());
  const footMid = new THREE.Vector3();
  for (const foot of feet) footMid.add(foot.getWorldPosition(new THREE.Vector3()));
  footMid.multiplyScalar(1 / feet.length);
  const bodyMid = headPos.clone().add(footMid).multiplyScalar(0.5);
  return {
    hipsY: hipsPos.y,
    hipsOffset: { x: hipsPos.x, z: hipsPos.z },
    bodyOffset: { x: bodyMid.x, z: bodyMid.z },
    headDir: { x: headPos.x - hipsPos.x, z: headPos.z - hipsPos.z },
  };
}

/**
 * boy/girl FBX 세트 로드, 머티리얼 보정, 피벗에 배치.
 * 크기와 중심은 바인드 포즈가 아니라 stay t=0(실제 서 있는 포즈) 기준.
 * @param {"boy"|"girl"} gender
 */
export async function loadCharacter(gender = "boy") {
  const preset = CONFIG.CHAR[gender] || CONFIG.CHAR.boy;

  const [stayFbx, walkFbx, runFbx, sitFbx, sitHiFbx, layFbx] = await Promise.all([
    loadFbx(preset.stay),
    loadFbx(preset.walk),
    loadFbx(preset.run),
    loadFbx(preset.sit),
    loadFbx(preset.sitHi),
    loadFbx(preset.lay),
  ]);

  const rawStay = pickClip(stayFbx, [/stay/i, /idle/i]);
  const hipsRef = hipsXZAt(rawStay, 0);

  const clips = {
    stay: pinHips(rawStay, hipsRef),
    walk: pinHips(pickClip(walkFbx, [/walk/i]), hipsRef, { lockDriftY: true }),
    run: pinHips(pickClip(runFbx, [/run/i]), hipsRef, { lockDriftY: true }),
    sit: pinHips(pickClip(sitFbx, [/sit/i]), hipsRef),
    sitHi: pinHips(pickClip(sitHiFbx, [/sit/i, /hi/i, /wave/i]), hipsRef),
    lay: pinHips(pickClip(layFbx, [/lay/i, /lie/i, /sleep/i]), hipsRef),
  };

  stayFbx.position.set(0, 0, 0);
  stayFbx.scale.set(1, 1, 1);
  stayFbx.updateMatrixWorld(true);

  const hips = findBone(stayFbx, /hips$/i);
  const head = findBone(stayFbx, /head$/i);
  const feet = [findBone(stayFbx, /lefttoebase$/i), findBone(stayFbx, /righttoebase$/i), findBone(stayFbx, /leftfoot$/i), findBone(stayFbx, /rightfoot$/i)].filter(Boolean);

  if (!hips || !head || feet.length === 0 || !clips.stay) {
    console.error("[character-calib] 뼈를 찾지 못했습니다", {
      hips: hips?.name ?? null,
      head: head?.name ?? null,
      feet: feet.map((bone) => bone.name),
    });
    throw new Error("캐릭터 뼈(Hips/Head/Foot)를 찾지 못했습니다");
  }

  applyClip(stayFbx, clips.stay, 0);
  const headY = head.getWorldPosition(new THREE.Vector3()).y;
  let footY = Infinity;
  const hipsStand = hips.getWorldPosition(new THREE.Vector3());
  for (const foot of feet) {
    footY = Math.min(footY, foot.getWorldPosition(new THREE.Vector3()).y);
  }
  const standHeight = Math.max(headY - footY, 0.001);
  const scale = CONFIG.CHARACTER_HEIGHT / standHeight;
  stayFbx.scale.setScalar(scale);
  stayFbx.position.set(-hipsStand.x * scale, -footY * scale, -hipsStand.z * scale);
  stayFbx.updateMatrixWorld(true);

  const poseCalib = {
    sit: clips.sit ? samplePose(stayFbx, clips.sit, 0, hips, head, feet) : null,
    lay: clips.lay ? samplePose(stayFbx, clips.lay, clips.lay.duration, hips, head, feet) : null,
  };
  applyClip(stayFbx, clips.stay, 0);

  prepareCharacterMaterials(stayFbx);
  stayFbx.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });

  const pivot = new THREE.Group();
  pivot.name = "characterPivot";
  pivot.add(stayFbx);
  pivot.position.set(CONFIG.SPAWN.x, 0, CONFIG.SPAWN.z);

  const mixer = new THREE.AnimationMixer(stayFbx);

  const round = (value) => Math.round(value * 1000) / 1000;
  console.info("[character-calib]", {
    gender,
    scale: round(scale),
    standHeight: round(standHeight * scale),
    hipsRestXZ: hipsRef ? { x: round(hipsRef.x), z: round(hipsRef.z) } : null,
    sit: poseCalib.sit && {
      hipsY: round(poseCalib.sit.hipsY),
      hipsOffset: { x: round(poseCalib.sit.hipsOffset.x), z: round(poseCalib.sit.hipsOffset.z) },
    },
    lay: poseCalib.lay && {
      hipsY: round(poseCalib.lay.hipsY),
      bodyOffset: { x: round(poseCalib.lay.bodyOffset.x), z: round(poseCalib.lay.bodyOffset.z) },
      headDir: { x: round(poseCalib.lay.headDir.x), z: round(poseCalib.lay.headDir.z) },
    },
  });
  console.info("[character] clips", {
    gender,
    stay: clips.stay?.name ?? null,
    walk: clips.walk?.name ?? null,
    run: clips.run?.name ?? null,
    sit: clips.sit?.name ?? null,
    sitHi: clips.sitHi?.name ?? null,
    lay: clips.lay?.name ?? null,
  });

  return {
    pivot,
    root: stayFbx,
    mixer,
    clips,
    gender,
    hips,
    head,
    poseCalib,
  };
}

/**
 * 이미 불러온 캐릭터를 복제(다른 사람 캐릭터용). FBX를 다시 읽지 않아 빠르다.
 * 스킨 뼈까지 새로 만들고, 클립·재질·보정값은 원본과 공유한다.
 * @param {Awaited<ReturnType<typeof loadCharacter>>} base
 */
export function cloneCharacter(base) {
  const root = SkeletonUtils.clone(base.root);
  const pivot = new THREE.Group();
  pivot.name = "remoteCharacterPivot";
  pivot.add(root);
  return {
    pivot,
    root,
    mixer: new THREE.AnimationMixer(root),
    clips: base.clips,
    gender: base.gender,
    hips: root.getObjectByName(base.hips.name),
    head: root.getObjectByName(base.head.name),
    poseCalib: base.poseCalib,
  };
}
