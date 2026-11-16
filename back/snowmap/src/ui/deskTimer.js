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
  const tabLabel = root.querySelector(".desk-timer-tab-label");
  /** 명령 실패 안내를 잠깐 보여 주는 동안의 문구 */
  let flashText = "";
  let flashTimer = 0;

  /** @type {{
   *   isRunning: boolean,
   *   startedAt: number|null,
   *   totalElapsedMs: number,
   *   subjects: {id:any,name:string,color?:string}[],
   *   selectedSubjectId: any,
   * }} */
  let snap = {
    isRunning: false,
    onBreak: false,
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
  /** 직전 프레임에 책상에 앉아 있었는지 (일어서는 순간을 잡는다) */
  let wasAtDesk = false;
  let wasRunning = false;
  /** 서 있는 채로 타이머가 멈춘 뒤 '정지됨' 칩을 보여 줄 마감 시각 */
  let lingerUntil = 0;
  let autoStopping = false;
  let leaveTimer = 0;
  /** 일어선 뒤 '정지됨' 칩이 남아 있는 시간(ms) */
  const STOP_LINGER_MS = 3000;
  let busy = false;

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

  /** 정지 버튼을 보여 줄 상태 (공부 중 또는 뽀모도로 휴식 중) */
  function isRunning() {
    return localMode ? localRunning : !!snap.isRunning || !!snap.onBreak;
  }

  function flash(text) {
    flashText = text;
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => {
      flashText = "";
      paintClock();
    }, 2200);
    paintClock();
  }

  /** 글자가 바뀔 때만 DOM을 건드린다 (같은 글자를 다시 넣어도 레이아웃 계산이 일어난다) */
  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function paintTrigger() {
    const subject = selectedSubject();
    const list = subjects();
    if (!subject) {
      setText(selectedName, list.length ? "과목 선택" : "과목 없음");
      selectedSwatch.style.background = "#555";
      selectedSwatch.style.opacity = "0.45";
      trigger.disabled = !list.length || busy;
      return;
    }
    setText(selectedName, subject.name);
    selectedSwatch.style.background = subject.color || "#A6DA95";
    selectedSwatch.style.opacity = "1";
    trigger.disabled = busy;
  }

  function paintClock() {
    setText(clock, formatClock(displayElapsedMs()));
    const running = isRunning();
    setText(toggleBtn, running ? "정지" : "시작");
    toggleBtn.classList.toggle("pause", running);
    toggleBtn.disabled = busy;
    root.classList.toggle("running", running);
    if (tabLabel) {
      setText(
        tabLabel,
        flashText ||
          (!running && mode === "chip"
            ? "정지됨"
            : !localMode && snap.onBreak
              ? "휴식 중"
              : "타이머"),
      );
    }
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
      onBreak: !!payload.onBreak,
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
      // 결과에는 스냅샷이 없을 수 있다. 최신 상태는 앱이 timer:snapshot으로 따로 보낸다.
      if (result?.snapshot) applySnapshot(result.snapshot);
      else busy = false;
      if (!result?.ok) {
        flash(result?.error === "timeout" ? "응답 없음" : "앱 타이머 연결 안 됨");
      }
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
    window.clearTimeout(leaveTimer);
    if (mode === "hidden") {
      setMenuOpen(false);
      // 사라지는 동안에는 직전 모양(칩/패널) 클래스를 그대로 둔다.
      // 먼저 지우면 페이드아웃 0.6초 동안 기본 모양(큰 패널)이 잠깐 보였다.
      root.classList.remove("entering");
      root.classList.add("leaving");
      leaveTimer = window.setTimeout(() => {
        if (mode === "hidden") {
          root.hidden = true;
          root.classList.remove("leaving", "chip", "panel");
        }
      }, 650);
      return;
    }
    root.classList.remove("chip", "panel", "leaving", "entering");
    root.hidden = false;
    root.classList.add(mode === "chip" ? "chip" : "panel", "entering");
    requestAnimationFrame(() => root.classList.remove("entering"));
    if (mode === "chip") setMenuOpen(false);
    renderSubjects();
    paintClock();
  }

  /**
   * 책상에 앉아 있으면 패널(시작·정지·과목).
   * 책상에서 일어나면 타이머를 멈추고, '정지됨' 칩을 3초 보여 준 뒤 스르륵 사라진다.
   * 다시 시작은 책상 의자에 앉아서만 한다.
   */
  function refreshVisibility() {
    const atDesk = Boolean(opts.isAtDesk?.());
    const running = isRunning();
    const now = performance.now();

    if (wasAtDesk && !atDesk && running && !autoStopping) {
      autoStopping = true;
      runCommand("stop").finally(() => {
        autoStopping = false;
      });
    }
    if (!atDesk && wasRunning && !running) {
      lingerUntil = now + STOP_LINGER_MS;
    }
    wasAtDesk = atDesk;
    wasRunning = running;

    if (atDesk) setMode("panel");
    else if (running) setMode("chip");
    else if (now < lingerUntil) setMode("chip");
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

  // 칩은 보기만 한다. 눌러도 타이머를 멈추지 않는다 (정지는 일어서기, 시작은 책상에서).

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

  // 시계는 초 단위라 매 프레임 그릴 필요가 없다. 0.25초마다 확인한다 (발열 줄이기)
  function tick() {
    const now = performance.now();
    if (localMode && localRunning) {
      if (localLastTick) localElapsedMs += now - localLastTick;
      localLastTick = now;
    }
    if (mode !== "hidden") paintClock();
  }

  // 네이티브 여부는 늦게 생길 수 있음 — 주기적으로 확인
  const nativeProbe = window.setInterval(() => {
    if (opts.bridge?.isNative) localMode = false;
  }, 1000);

  paintClock();
  renderSubjects();
  const clockTimer = window.setInterval(tick, 250);

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
      window.clearInterval(clockTimer);
      window.clearTimeout(flashTimer);
      window.clearTimeout(leaveTimer);
      window.clearInterval(nativeProbe);
      listeners.clear();
    },
  };
}
