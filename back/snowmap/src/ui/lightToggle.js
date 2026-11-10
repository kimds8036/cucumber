import { lampActionLabel } from "../world/mapLamps.js";

/**
 * 근처 램프 ON/OFF 버튼 (우측 상단).
 * - 앉음: 책상등만
 * - 서 있음: desk 제외 토글 가능 램프
 * - lights-colored는 mapLamps에 없음
 *
 * @param {{
 *   mapLamps: ReturnType<import("../world/mapLamps.js").createMapLamps>,
 *   getPivot: () => import("three").Object3D|null,
 *   isSitting: () => boolean,
 * }} opts
 */
export function createLightToggle(opts) {
  let el = document.getElementById("light-toggle");
  if (!el) {
    el = document.createElement("button");
    el.id = "light-toggle";
    el.type = "button";
    el.hidden = true;
    document.body.appendChild(el);
  }

  /** @type {any} */
  let nearby = null;
  let lastKey = "";

  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (!nearby) return;
    opts.mapLamps.toggleLamp(nearby);
    refresh();
  });

  function refresh() {
    const pivot = opts.getPivot();
    if (!pivot) {
      nearby = null;
      el.hidden = true;
      el.classList.remove("on");
      return;
    }

    const sitting = opts.isSitting();
    const item = sitting
      ? opts.mapLamps.nearestLamp(pivot.position.x, pivot.position.z, { deskOnly: true })
      : opts.mapLamps.nearestLamp(pivot.position.x, pivot.position.z, { excludeDesk: true });

    nearby = item;
    const key = !item ? "hide" : `${item.x.toFixed(2)}:${item.z.toFixed(2)}:${item.on ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;
    if (!item) {
      el.hidden = true;
      el.classList.remove("on");
      return;
    }
    el.hidden = false;
    el.textContent = lampActionLabel(item);
    el.classList.toggle("on", item.on);
    el.setAttribute("aria-pressed", item.on ? "true" : "false");
  }

  return { el, refresh };
}
