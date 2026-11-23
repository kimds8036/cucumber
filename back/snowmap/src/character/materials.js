import * as THREE from "three";
import { CONFIG } from "../config.js";

function isSkinMaterial(mat, meshName) {
  const label = `${mat?.name || ""} ${meshName || ""}`.toLowerCase();
  return /(skin|face)/.test(label);
}

/**
 * 하얗게 뜸 방지 규칙:
 * - 밝기 곱/채도/fill 금지
 * - map.colorSpace = SRGB
 * - emissiveMap = map, intensity ≤ CHARACTER_EMISSIVE_INTENSITY
 * - 텍스처가 있으면 color = 흰색(텍스처 본래 색). 텍스처 없는 Skin/Face만 살구색 단색
 */
export function prepareCharacterMaterials(root) {
  const skinTint = new THREE.Color(CONFIG.CHARACTER_SKIN_TINT);
  const reports = [];

  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const source = Array.isArray(child.material) ? child.material : [child.material];
    const next = source.map((material) => {
      const mat = material.clone();
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
        // FBX 기본 diffuse(#cccccc)가 텍스처에 곱해져 피부가 칙칙해진다. 텍스처 본래 색 그대로 쓴다.
        if (mat.color) mat.color.set(1, 1, 1);
        if (mat.emissive) {
          mat.emissiveMap = mat.map;
          mat.emissive.set(1, 1, 1);
          mat.emissiveIntensity = CONFIG.CHARACTER_EMISSIVE_INTENSITY;
        }
      }
      // FBX Phong: specular #404040 + shininess 0 이면 모든 면에 회색 하이라이트가 고르게 깔려 색이 바랜다
      if (mat.specular && !(mat.shininess > 1)) mat.specular.set(0x000000);
      const skin = isSkinMaterial(mat, child.name);
      if (skin && mat.color && !mat.map) mat.color.copy(skinTint);

      if (reports.length < 12) {
        reports.push({
          mesh: child.name || "(unnamed)",
          mat: mat.name || "(unnamed)",
          type: mat.type,
          hasMap: Boolean(mat.map),
          skin,
          mapColorSpace: mat.map?.colorSpace ?? null,
          emissiveIntensity: mat.emissiveIntensity ?? null,
        });
      }
      return mat;
    });
    child.material = Array.isArray(child.material) ? next : next[0];
  });

  console.info("[character-materials]", reports);
  return reports;
}
