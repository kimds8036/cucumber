/**
 * 책상 타이머 UI — 앱 타이머 스냅샷 미러(브릿지).
 * 브릿지 없으면 로컬 폴백(브라우저 단독 테스트).
 *
 * @param {{
 *   isAtDesk: () => boolean,
 *   bridge?: { isNative: boolean, timerCommand: Function },
 *   getSubjects?: () => { id: string|number, name: string, color?: string }[],
 * }} opts
 */

const LOCAL_SUBJECTS = [
  { id: "sub-math", name: "수학", color: "#FFBCBC" },
  { id: "sub-eng", name: "영어", color: "#AEEEB9" },
  { id: "sub-kor", name: "국어", color: "#B5BEFB" },
  { id: "sub-sci", name: "과학", color: "#A1ECE2" },
];

export function createDeskTimer(opts) {
  let root = document.getElementById("desk-timer");
  if (!root) {
    root = document.createElement("div");
    root.id = "desk-timer";
    root.hidden = true;
    document.body.appendChild(root);
  }

  root.innerHTML = `
    <div class="desk-timer-card">
      <div class="desk-timer-top">
        <span class="desk-timer-tab-dot"></span>
        <span class="desk-timer-tab-label">타이머</span>
        <span id="desk-timer-clock">00:00:00</span>
      </div>
      <div class="desk-timer-actions">
        <button type="button" id="desk-timer-toggle" class="primary">시작</button>
      </div>
      <div class="desk-timer-subjects">
        <button type="button" id="desk-timer-subject-trigger" class="desk-timer-subject-trigger" aria-expanded="false">
          <span class="desk-timer-swatch" id="desk-timer-selected-swatch"></span>
          <span class="desk-timer-subject-name" id="desk-timer-selected-name">과목 선택</span>
          <span class="desk-timer-caret">▾</span>
        </button>
        <div id="desk-timer-subject-list" class="desk-timer-subject-list" hidden></div>
      </div>
    </div>
  `;

  const clock = root.querySelector("#desk-timer-clock");
  const toggleBtn = root.querySelector("#desk-timer-toggle");
  const trigger = root.querySelector("#desk-timer-subject-trigger");
  const subjectList = root.querySelector("#desk-timer-subject-list");
  const selectedSwatch = root.querySelector("#desk-timer-selected-swatch");
  const selectedName = root.querySelector("#desk-timer-selected-name");

  /** @type {{
   *   isRunning: boolean,
   *   startedAt: number|null,
   *   totalElapsedMs: number,
   *   subjects: {id:any,name:string,color?:string}[],
   *   selectedSubjectId: any,
   * }} */
  let snap = {
    isRunning: false,
    startedAt: null,
    totalElapsedMs: 0,
    subjects: [],
    selectedSubjectId: null,
  };

  let localMode = !opts.bridge?.isNative;
  let localRunning = false;
  let localElapsedMs = 0;
  let localLastTick = 0;
  let localSelectedId = null;

  let menuOpen = false;
  let mode = "hidden"; // hidden | chip | panel
  let busy = false;
  let raf = 0;

  const listeners = new Set();

  function formatClock(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function subjects() {
    if (!localMode && snap.subjects?.length) return snap.subjects;
    if (typeof opts.getSubjects === "function") {
      const list = opts.getSubjects();
      if (Array.isArray(list) && list.length) return list;
    }
    return localMode ? LOCAL_SUBJECTS : snap.subjects || [];
  }

  function selectedId() {
    return localMode ? localSelectedId : snap.selectedSubjectId;
  }

  function selectedSubject() {
    const id = selectedId();
    return subjects().find((s) => String(s.id) === String(id)) || null;
  }

  function displayElapsedMs(now = Date.now()) {
    if (localMode) {
      return localElapsedMs;
    }
    const base = Number(snap.totalElapsedMs) || 0;
    if (snap.isRunning && snap.startedAt) {
      return base + Math.max(0, now - Number(snap.startedAt));
    }
    return base;
  }

  function isRunning() {
    return localMode ? localRunning : !!snap.isRunning;
  }

  function paintTrigger() {
    const subject = selectedSubject();
    const list = subjects();
    if (!subject) {
      selectedName.textContent = list.length ? "과목 선택" : "과목 없음";
      selectedSwatch.style.background = "#555";
      selectedSwatch.style.opacity = "0.45";
      trigger.disabled = !list.length || busy;
      return;
    }
    selectedName.textContent = subject.name;
    selectedSwatch.style.background = subject.color || "#A6DA95";
    selectedSwatch.style.opacity = "1";
    trigger.disabled = busy;
  }

  function paintClock() {
    clock.textContent = formatClock(displayElapsedMs());
    const running = isRunning();
    toggleBtn.textContent = running ? "정지" : "시작";
    toggleBtn.classList.toggle("pause", running);
    toggleBtn.disabled = busy;
    root.classList.toggle("running", running);
    root.classList.toggle("busy", busy);
    paintTrigger();
  }

  function setMenuOpen(next) {
    if (!subjects().length) next = false;
    menuOpen = next;
    subjectList.hidden = !menuOpen;
    trigger.setAttribute("aria-expanded", menuOpen ? "true" : "false");
    root.classList.toggle("menu-open", menuOpen);
  }

  function renderSubjects() {
    subjectList.replaceChildren();
    const list = subjects();
    const cur = selectedId();
    if (!list.length) {
      setMenuOpen(false);
      paintTrigger();
      return;
    }
    for (const subject of list) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "desk-timer-subject";
      if (String(subject.id) === String(cur)) btn.classList.add("active");

      const swatch = document.createElement("span");
      swatch.className = "desk-timer-swatch";
      swatch.style.background = subject.color || "#A6DA95";

      const name = document.createElement("span");
      name.className = "desk-timer-subject-name";
      name.textContent = subject.name;

      btn.append(swatch, name);
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        setMenuOpen(false);
        await selectSubject(subject.id);
      });
      subjectList.append(btn);
    }
    paintTrigger();
  }

  function applySnapshot(payload = {}) {
    localMode = false;
    snap = {
      isRunning: !!payload.isRunning,
      startedAt: payload.startedAt != null ? Number(payload.startedAt) : null,
      totalElapsedMs: Number(payload.totalElapsedMs) || 0,
      subjects: Array.isArray(payload.subjects) ? payload.subjects : [],
      selectedSubjectId:
        payload.selectedSubjectId === undefined
          ? snap.selectedSubjectId
          : payload.selectedSubjectId,
    };
    busy = false;
    renderSubjects();
    paintClock();
    listeners.forEach((fn) => {
      try {
        fn(getState());
      } catch {
        // ignore
      }
    });
  }

  function getState() {
    return {
      isRunning: isRunning(),
      startedAt: localMode ? null : snap.startedAt,
      totalElapsedMs: localMode ? localElapsedMs : snap.totalElapsedMs,
      selectedSubjectId: selectedId(),
      localMode,
    };
  }

  async function runCommand(action, extra = {}) {
    if (busy) return { ok: false, error: "busy" };
    if (localMode || !opts.bridge?.isNative) {
      return runLocal(action, extra);
    }
    busy = true;
    paintClock();
    try {
      const result = await opts.bridge.timerCommand(action, extra);
      if (result?.snapshot) applySnapshot(result.snapshot);
      else busy = false;
      paintClock();
      return result || { ok: false };
    } catch (err) {
      busy = false;
      paintClock();
      return { ok: false, error: err?.message || "failed" };
    }
  }

  function runLocal(action, extra = {}) {
    if (action === "start") {
      localRunning = true;
      localLastTick = performance.now();
      if (extra.subjectId != null) localSelectedId = extra.subjectId;
    } else if (action === "stop") {
      localRunning = false;
      localLastTick = 0;
    } else if (action === "selectSubject") {
      localSelectedId = extra.subjectId ?? null;
      if (localRunning) {
        // 과목만 바꾸고 계속 진행
      }
    }
    renderSubjects();
    paintClock();
    return { ok: true };
  }

  async function selectSubject(id) {
    return runCommand("selectSubject", { subjectId: id });
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    root.classList.remove("chip", "panel", "leaving", "entering");
    if (mode === "hidden") {
      setMenuOpen(false);
      root.classList.add("leaving");
      window.setTimeout(() => {
        if (mode === "hidden") {
          root.hidden = true;
          root.classList.remove("leaving");
        }
      }, 220);
      return;
    }
    root.hidden = false;
    root.classList.add(mode === "chip" ? "chip" : "panel", "entering");
    requestAnimationFrame(() => root.classList.remove("entering"));
    if (mode === "chip") setMenuOpen(false);
    renderSubjects();
    paintClock();
  }

  function refreshVisibility() {
    const atDesk = Boolean(opts.isAtDesk?.());
    const running = isRunning();
    if (atDesk) setMode("panel");
    else if (running) setMode("chip");
    else setMode("hidden");
  }

  async function toggleRunning() {
    if (busy) return;
    if (isRunning()) await runCommand("stop");
    else {
      const sid = selectedId();
      await runCommand("start", { subjectId: sid ?? null });
    }
    refreshVisibility();
  }

  toggleBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await toggleRunning();
  });

  // 칩 모드에서는 버튼이 숨겨지므로 카드 탭으로 정지/시작
  root.addEventListener("click", async (e) => {
    if (mode !== "chip" || busy) return;
    if (e.target instanceof Element && e.target.closest("button")) return;
    e.preventDefault();
    await toggleRunning();
  });

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    if (mode !== "panel" || busy) return;
    if (!subjects().length) return;
    setMenuOpen(!menuOpen);
  });

  document.addEventListener("pointerdown", (e) => {
    if (!menuOpen) return;
    if (root.contains(/** @type {Node} */ (e.target))) return;
    setMenuOpen(false);
  });

  function tick(now) {
    if (localMode && localRunning) {
      if (localLastTick) localElapsedMs += now - localLastTick;
      localLastTick = now;
    }
    if (mode !== "hidden") paintClock();
    raf = requestAnimationFrame(tick);
  }

  // 네이티브 여부는 늦게 생길 수 있음 — 주기적으로 확인
  const nativeProbe = window.setInterval(() => {
    if (opts.bridge?.isNative) localMode = false;
  }, 1000);

  paintClock();
  renderSubjects();
  raf = requestAnimationFrame(tick);

  return {
    applySnapshot,
    refresh() {
      refreshVisibility();
    },
    getState,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSelectedSubjectId() {
      return selectedId();
    },
    dispose() {
      cancelAnimationFrame(raf);
      window.clearInterval(nativeProbe);
      listeners.clear();
    },
  };
}
