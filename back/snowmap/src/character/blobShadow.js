import * as THREE from "three";
import { CONFIG } from "../config.js";

/**
 * 캐릭터 발밑 둥근 그림자.
 * 그림자 맵을 고정(맵만 처음 한 번 그림)해서 움직이는 캐릭터는 실제 그림자를 만들지 않는다.
 * 대신 반투명 원 하나를 발밑에 깐다 — 그리기 1번, 그림자 패스 0번.
 * 텍스처·재질·모양은 모든 캐릭터가 같이 쓴다.
 */
let shared = null;

function getShared() {
  if (shared) return shared;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: CONFIG.BLOB_SHADOW_OPACITY,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const r = CONFIG.BLOB_SHADOW_RADIUS;
  const geometry = new THREE.PlaneGeometry(r * 2, r * 2);
  geometry.rotateX(-Math.PI / 2);
  shared = { material, geometry };
  return shared;
}

export function createBlobShadow() {
  const { material, geometry } = getShared();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "blobShadow";
  mesh.position.y = 0.01;
  mesh.renderOrder = 1;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  // 아웃라인·클릭 판정에서 빼려고 표시
  mesh.userData.isBlobShadow = true;
  return mesh;
}
