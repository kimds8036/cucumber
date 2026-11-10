import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { CONFIG } from "../config.js";

/**
 * 머리 위 이름표 + 말풍선. HTML이라 한글이 선명하고 CSS로 꾸민다.
 * render()는 캐릭터가 보간된 위치에 있을 때(renderer.render 직후) 호출해야 떨리지 않는다.
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 */
export function createNameTags(scene, camera) {
  const container = document.getElementById("labels");
  const labelRenderer = new CSS2DRenderer({ element: container });
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", () => labelRenderer.setSize(window.innerWidth, window.innerHeight));

  /**
   * @type {Map<string, {
   *   obj: CSS2DObject, bubble: HTMLElement, name: HTMLElement,
   *   getHead: (out: THREE.Vector3) => THREE.Vector3|null, hideUntil: number, clearTimer: number
   * }>}
   */
  const tags = new Map();
  const head = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  /**
   * @param {string} id
   * @param {{ name: string, isMe?: boolean, getHead: (out: THREE.Vector3) => THREE.Vector3|null }} opts
   */
  function add(id, opts) {
    remove(id);
    const el = document.createElement("div");
    el.className = opts.isMe ? "nametag me" : "nametag";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = opts.name;
    el.append(bubble, name);
    const obj = new CSS2DObject(el);
    obj.center.set(0.5, 1);
    obj.visible = false;
    scene.add(obj);
    tags.set(id, { obj, bubble, name, getHead: opts.getHead, hideUntil: 0, clearTimer: 0 });
  }

  function remove(id) {
    const tag = tags.get(id);
    if (!tag) return;
    window.clearTimeout(tag.clearTimer);
    scene.remove(tag.obj);
    tag.obj.element.remove();
    tags.delete(id);
  }

  function setName(id, text) {
    const tag = tags.get(id);
    if (tag) tag.name.textContent = text;
  }

  /** 말풍선. 같은 사람이 새로 말하면 바로 교체 */
  function say(id, text) {
    const tag = tags.get(id);
    if (!tag) return;
    window.clearTimeout(tag.clearTimer);
    tag.bubble.textContent = text;
    tag.bubble.classList.add("show");
    tag.hideUntil = performance.now() + CONFIG.CHAT_BUBBLE_SECONDS * 1000;
  }

  function render() {
    const now = performance.now();
    camera.getWorldPosition(camPos);
    for (const tag of tags.values()) {
      const p = tag.getHead(head);
      if (!p) {
        tag.obj.visible = false;
        continue;
      }
      tag.obj.position.set(p.x, p.y + CONFIG.NAMETAG_HEIGHT_OFFSET, p.z);
      tag.obj.visible = camPos.distanceTo(tag.obj.position) <= CONFIG.NAMETAG_MAX_DISTANCE;
      if (tag.hideUntil && now > tag.hideUntil) {
        tag.hideUntil = 0;
        tag.bubble.classList.remove("show");
        tag.clearTimer = window.setTimeout(() => {
          tag.bubble.textContent = "";
        }, 400);
      }
    }
    labelRenderer.render(scene, camera);
  }

  return { add, remove, setName, say, render };
}
