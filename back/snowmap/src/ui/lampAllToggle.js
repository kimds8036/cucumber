/**
 * 가로등 전체 ON/OFF. 하나라도 켜져 있으면 전부 끄고, 아니면 전부 켠다.
 * @param {ReturnType<import("../world/mapLamps.js").createMapLamps>} mapLamps
 */
export function createLampAllToggle(mapLamps) {
  let el = document.getElementById("lamp-all");
  if (!el) {
    el = document.createElement("button");
    el.id = "lamp-all";
    el.type = "button";
    document.body.appendChild(el);
  }

  let lastKey = "";

  function refresh() {
    const state = mapLamps.streetLampState();
    if (!state.total) {
      if (lastKey === "none") return;
      lastKey = "none";
      el.hidden = true;
      return;
    }
    const key = state.on > 0 ? "on" : "off";
    if (key === lastKey) return;
    lastKey = key;
    el.hidden = false;
    el.textContent = state.on > 0 ? "가로등 전체 OFF" : "가로등 전체 ON";
    el.classList.toggle("on", state.on > 0);
  }

  el.addEventListener("click", (e) => {
    e.preventDefault();
    const state = mapLamps.streetLampState();
    mapLamps.setStreetLamps(state.on === 0);
    lastKey = "";
    refresh();
  });

  refresh();
  return { el, refresh };
}
