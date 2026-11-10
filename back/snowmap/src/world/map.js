import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CONFIG } from "../config.js";

/**
 * 맵 GLB 로드 + 시각 메시만 씬에 추가.
 * 충돌 데이터는 collision.js가 별도로 만든다.
 */
export async function loadMap(scene) {
  // 브라우저/CDN 캐시로 옛 GLB가 남는 것 방지 (수정본 즉시 반영)
  const base = CONFIG.MAP_URL;
  const url = `${base}${base.includes("?") ? "&" : "?"}v=${Date.now()}`;
  const loader = new GLTFLoader();

  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch (err) {
    console.error(`[map] 로드 실패: ${url}`, err);
    throw new Error(`맵을 불러오지 못했습니다: ${base}`);
  }

  const root = gltf.scene;
  root.name = "mapRoot";
  root.updateMatrixWorld(true);

  const shadowBox = new THREE.Box3();
  const shadowSize = new THREE.Vector3();
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.receiveShadow = true;
    shadowBox.setFromObject(child);
    shadowBox.getSize(shadowSize);
    // 작은 소품은 그림자 패스에서 빼 이동 중 드로우 비용을 줄인다.
    child.castShadow = Math.max(shadowSize.x, shadowSize.y, shadowSize.z) >= 0.3;
  });

  scene.add(root);

  const box = new THREE.Box3().setFromObject(root);
  console.info("[map] loaded", url, {
    meshes: countMeshes(root),
    bounds: {
      min: box.min.toArray(),
      max: box.max.toArray(),
    },
  });

  return { root, bounds: box };
}

function countMeshes(root) {
  let n = 0;
  root.traverse((c) => {
    if (c.isMesh) n += 1;
  });
  return n;
}
