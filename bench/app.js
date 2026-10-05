/* Forma test bench: the app's real planning core (window.Forma) driven by
   live Claude calls through the artifact `sample` capability. */
(() => {
  "use strict";
  const F = window.Forma;
  const D = F.dates;
  const $app = document.getElementById("app");
  const STORE = "forma-bench-plans-v1";

  const HEADINGS = [
    "What are we planning today?", "What are you building?", "What are you trying to accomplish?",
    "What should we figure out?", "What’s on your mind?", "What are we working toward?",
    "What should we plan next?", "What are you getting ready for?", "What do you want to make happen?", "What’s the goal?",
  ];
  const CHIPS = [
    ["Study", "Help me create a study plan for "], ["Fitness", "Plan a fitness routine that helps me "],
    ["Travel", "Plan a trip to "], ["Career", "Help me plan my next career move: "],
    ["Projects", "Help me turn this idea into a project plan: "], ["Finance", "Help me build a plan to save "],
    ["Life", "Help me get organized around "], ["Business", "Help me plan the launch of "],
  ];
  const TIERS = [["default", "Claude · Balanced"], ["complex", "Claude · Deep"], ["quick", "Claude · Fast"]];
  const PACE = { stage: 260, meta: 420, phase: 300, task: 95, milestone: 160, risk: 60, resource: 50, next: 80, clarify: 0, done: 700, error: 0 };
  const PREFS = { planningStyle: "balanced", defaultDurationWeeks: null, dailyMinutes: 60, blockedWeekdays: [], responseStyle: "concise" };

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  const pick = (prev) => { let n = Math.floor(Math.random() * HEADINGS.length); if (n === prev) n = (n + 1) % HEADINGS.length; return n; };
  const icon = {
    logo: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="16" height="16" rx="5" fill="currentColor"/><rect x="5.5" y="5.75" width="9" height="1.9" rx=".95" fill="var(--bg)"/><rect x="5.5" y="9.05" width="6.2" height="1.9" rx=".95" fill="var(--bg)" fill-opacity=".7"/><rect x="5.5" y="12.35" width="3.4" height="1.9" rx=".95" fill="var(--accent)"/></svg>',
    up: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 5h4v4H3zM3 15h4v4H3zM11 7h10M11 17h10"/></svg>',
    gantt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 4v16h18M8 8h7M10 12h8M7 16h6"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    wand: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5"/></svg>',
  };
  const loadStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; } };
  const saveStore = (records) => { try { localStorage.setItem(STORE, JSON.stringify(records.slice(0, 20))); } catch { /* storage unavailable: plans last for this visit */ } };

  /* ---------- state ---------- */
  const S = {
    screen: "home", heading: pick(-1), prompt: "", tier: "default", notice: "",
    gen: null, plan: null, chat: [], view: "overview", openTask: null, weekOf: null,
    pending: null, records: loadStore(), menu: false, asstOpen: false,
  };
  let sample = null, sampleChecked = false;
  try {
    window.claude?.use?.("sample").then((s) => { sample = s; sampleChecked = true; if (S.screen === "home") renderHome(); }).catch(() => { sampleChecked = true; });
  } catch { sampleChecked = true; }
  setTimeout(() => { if (!sampleChecked) { sampleChecked = true; if (S.screen === "home") renderHome(); } }, 11000);

  /* ---------- shell ---------- */
  function topbar() {
    return `<header class="top">
      <button class="brand" data-a="home" aria-label="New plan">${icon.logo}<span>${esc(F.product.name)}</span></button>
      <span class="chip-bench">Test bench</span>
      <nav aria-label="Primary">
        <button class="btn" data-a="menu" aria-expanded="${S.menu}">${icon.clock}<span class="lbl">History</span></button>
        <button class="btn" data-a="home">${icon.plus}<span class="lbl">New Plan</span></button>
        ${S.menu ? historyMenu() : ""}
      </nav>
    </header>`;
  }
  function historyMenu() {
    if (!S.records.length) return `<div class="menu" role="menu"><div class="empty">No plans yet. Start with something you’re trying to accomplish.</div></div>`;
    return `<div class="menu" role="menu"><p class="label">Saved in this browser</p>${S.records.map((r) => {
      const p = F.progress(r.plan);
      return `<button class="item" role="menuitem" data-a="open" data-id="${r.plan.id}"><span>${esc(r.plan.title)}</span><span class="num">${p.done}/${p.total}</span></button>`;
    }).join("")}</div>`;
  }

  /* ---------- home ---------- */
  function renderHome() {
    S.screen = "home";
    document.body.classList.remove("in-ws");
    const unavailable = sampleChecked && !sample;
    $app.innerHTML = `${topbar()}
    <main class="home" id="main">
      <h1 class="heading">${esc(HEADINGS[S.heading])}</h1>
      <form class="composer" id="composer">
        <label for="prompt" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Describe what you want to accomplish</label>
        <textarea id="prompt" rows="3" maxlength="8000" placeholder="Tell me what you want to accomplish…">${esc(S.prompt)}</textarea>
        <div class="bar">
          <span class="hint"><kbd>⌘</kbd><kbd>↵</kbd></span>
          <select class="tier" id="tier" aria-label="Model">${TIERS.map(([v, l]) => `<option value="${v}" ${v === S.tier ? "selected" : ""}>${l}</option>`).join("")}</select>
          <button class="send ${S.prompt.trim().length > 1 ? "ready" : ""}" id="send" type="submit" aria-label="Build plan">${icon.up}</button>
        </div>
      </form>
      ${S.notice || unavailable ? `<p class="notice" role="status">${esc(S.notice || "Claude isn’t available in this view. Open this page in Claude to generate plans.")}</p>` : ""}
      <ul class="chips" aria-label="Starting points">${CHIPS.map(([l], i) => `<li style="animation-delay:${0.25 + i * 0.03}s"><button type="button" data-a="chip" data-i="${i}">${l}</button></li>`).join("")}</ul>
      <p class="footnote">Plans are generated by Claude on your account and saved in this browser.</p>
    </main>`;
    const ta = document.getElementById("prompt");
    const grow = () => { ta.style.height = "0px"; ta.style.height = Math.min(Math.max(ta.scrollHeight, 104), 300) + "px"; };
    grow();
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener("input", () => { S.prompt = ta.value; grow(); document.getElementById("send").classList.toggle("ready", S.prompt.trim().length > 1); });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } });
    document.getElementById("tier").addEventListener("change", (e) => { S.tier = e.target.value; });
    document.getElementById("composer").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
  }

  function applyChip(i) {
    const starter = CHIPS[i][1];
    const cur = S.prompt.trim();
    const existing = CHIPS.find(([, s]) => cur.startsWith(s.trim()));
    S.prompt = !cur ? starter : existing ? starter + cur.slice(existing[1].trim().length).trimStart() : starter + cur[0].toLowerCase() + cur.slice(1);
    renderHome();
  }

  /* ---------- generation ---------- */
  function submit(request) {
    const req = request || { prompt: S.prompt.trim(), tier: S.tier, clarification: null };
    if (req.prompt.length < 2) return;
    if (!sample) {
      S.notice = sampleChecked ? "Claude isn’t available in this view. Open this page in Claude to generate plans." : "Connecting to Claude… try again in a moment.";
      renderHome();
      return;
    }
    S.notice = "";
    const from = !request ? document.getElementById("composer")?.getBoundingClientRect() : null;
    startGeneration(req, from);
  }

  function startGeneration(req, fromRect) {
    S.gen?.ctl?.abort();
    S.screen = "gen";
    S.menu = false;
    const g = (S.gen = {
      req, status: "streaming", stage: null, error: null, clarify: null, plan: null,
      meta: null, phases: [], tasks: [], milestones: [], queue: [], draining: false, ctl: new AbortController(), run: uid(),
    });
    $app.innerHTML = `${topbar()}
    <main class="gen" id="main">
      <div class="pill ${fromRect ? "wait" : ""}" id="pill"><p>${esc(req.prompt)}</p><button class="btn sm" data-a="stop" id="stop">Stop</button></div>
      <div class="ambient" aria-hidden="true"></div>
      <section class="canvas" id="canvas" aria-label="Building your plan" aria-busy="true">
        <div class="c-head"><div class="status" role="status" aria-live="polite" id="status"></div><span style="font-size:12px;color:var(--fg-subtle)">${esc(TIERS.find((t) => t[0] === req.tier)[1])}</span></div>
        <div class="c-body">
          <ol class="stages" id="stages" aria-label="Planning progress">${F.STAGES.map((s) => `<li data-s="${s.id}"><i></i>${esc(s.label)}</li>`).join("")}</ol>
          <div class="graph-wrap" id="gwrap"><div class="graph" id="graph"></div></div>
        </div>
        <div class="c-foot"><span class="progress-line" id="pline"></span><span id="line"></span><span class="counts num" id="counts"></span></div>
      </section>
    </main>`;
    if (fromRect) travel(fromRect, req.prompt);
    drawGraphShell();
    setStage(null);
    run(g);
  }

  /** The prompt surface physically moves from the centre to its place above the canvas. */
  function travel(from, text) {
    const pill = document.getElementById("pill");
    const to = pill.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "ghost";
    Object.assign(ghost.style, { top: from.top + "px", left: from.left + "px", width: from.width + "px", height: from.height + "px", borderRadius: "22px" });
    ghost.innerHTML = `<p>${esc(text)}</p>`;
    document.body.appendChild(ghost);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      Object.assign(ghost.style, { top: to.top + "px", left: to.left + "px", width: to.width + "px", height: to.height + "px", borderRadius: "16px" });
      ghost.querySelector("p").style.opacity = "0";
    }));
    setTimeout(() => { pill.classList.remove("wait"); pill.style.transition = "opacity .25s"; ghost.style.opacity = "0"; }, 650);
    setTimeout(() => ghost.remove(), 1000);
  }

  async function run(g) {
    const today = D.localToday();
    const asm = new F.PlanAssembler({ planId: uid(), prompt: g.req.prompt, today, model: "claude:" + g.req.tier, preferences: PREFS });
    const emit = (events) => events.forEach((e) => enqueue(g, e));
    emit(asm.advance("understanding"));
    const thinkTimer = setTimeout(() => emit(asm.advance("constraints")), 2600);

    const input = `${F.PLANNER_SYSTEM_PROMPT}\n\n---\n\n${F.buildPlannerUserMessage({ prompt: g.req.prompt, today, preferences: PREFS, context: [], clarification: g.req.clarification })}`;
    let pending = "";
    try {
      await sample(input, {
        modelTier: g.req.tier, cache: false, signal: g.ctl.signal,
        onText: ({ delta }) => {
          clearTimeout(thinkTimer);
          const lines = (pending + delta).split("\n");
          pending = lines.pop();
          for (const l of lines) { emit(asm.push(l)); if (asm.clarified) { g.ctl.abort(); return; } }
        },
      });
      if (pending.trim()) emit(asm.push(pending));
    } catch (e) {
      clearTimeout(thinkTimer);
      if (asm.clarified) return;
      if (e?.code === "cancelled") return;
      if (!(e?.text && asm.hasContent)) return enqueue(g, { type: "error", message: errorCopy(e?.code) });
    }
    clearTimeout(thinkTimer);
    if (asm.clarified) return;
    if (!asm.hasContent) return enqueue(g, { type: "error", message: "Something went wrong while building your plan." });
    emit(asm.advance("finalizing"));
    try {
      const plan = asm.finish();
      enqueue(g, { type: "done", plan });
    } catch (err) {
      console.error(err);
      enqueue(g, { type: "error", message: "Something went wrong while building your plan." });
    }
  }

  function errorCopy(code) {
    if (code === "not_granted") return "This page needs permission to use Claude. Allow it, then try again.";
    if (code === "rate_limited") return "You’ve reached a usage limit for now. Try again a little later.";
    if (code === "refused") return "Claude couldn’t plan that request. Try rephrasing the goal.";
    if (code === "session_expired") return "Your session expired. Sign in to Claude again, then retry.";
    return "Something went wrong while building your plan.";
  }

  function enqueue(g, e) {
    if (g !== S.gen) return;
    g.queue.push(e);
    if (!g.draining) { g.draining = true; setTimeout(() => drain(g), 0); }
  }
  function drain(g) {
    if (g !== S.gen) return;
    const e = g.queue.shift();
    if (!e) { g.draining = false; return; }
    apply(g, e);
    const backlog = g.queue.length;
    const factor = backlog > 30 ? 0.25 : backlog > 12 ? 0.5 : 1;
    const next = g.queue[0];
    setTimeout(() => drain(g), next ? (PACE[next.type] ?? 60) * factor : 0);
  }

  function apply(g, e) {
    if (S.screen !== "gen") return;
    switch (e.type) {
      case "stage": g.stage = e.stage; setStage(e.stage); break;
      case "meta": g.meta = e.meta; setGoal(e.meta.title); break;
      case "phase": g.phases.push(e.phase); addPhase(e.phase); break;
      case "task": g.tasks.push(e.task); addTask(e.task); break;
      case "milestone": g.milestones.push(e.milestone); drawStrip(); break;
      case "clarify": g.status = "clarify"; g.clarify = e; showClarify(e); break;
      case "error": g.status = "error"; g.error = e.message; showError(e.message); break;
      case "done": g.status = "ready"; g.plan = e.plan; ready(g); break;
    }
    updateFooter();
  }

  function setStage(stage) {
    const i = stage ? F.stageIndex(stage) : -1;
    document.querySelectorAll("#stages li").forEach((li, j) => {
      li.className = S.gen.status === "ready" || j < i ? "done" : j === i ? "active" : "";
    });
    updateStatus();
  }
  function updateStatus() {
    const g = S.gen, el = document.getElementById("status");
    if (!el) return;
    const st = F.STAGES[g.stage ? F.stageIndex(g.stage) : 0];
    const [cls, label] = g.status === "ready" ? ["ok", "Ready"] : g.status === "error" ? ["err", "Paused"] : g.status === "clarify" ? ["wait", "Needs input"] : ["work", st.status];
    el.innerHTML = cls === "ok"
      ? `<span class="dot ok">${icon.check.replace("<svg", '<svg width="9" height="9" stroke="currentColor"')}</span>${label}`
      : `<span class="dot ${cls}"></span>${label}`;
  }
  function updateFooter() {
    const g = S.gen;
    const line = document.getElementById("line"), counts = document.getElementById("counts"), pl = document.getElementById("pline");
    if (!line) return;
    const st = F.STAGES[g.stage ? F.stageIndex(g.stage) : 0];
    const text = g.status === "ready" ? "✓  Your plan is ready." : g.status === "error" ? g.error : g.status === "clarify" ? "One quick question before I plan this." : st.line;
    if (line.textContent !== text) { line.textContent = text; line.style.animation = "none"; void line.offsetWidth; line.style.animation = "rise .35s var(--ease) both"; }
    counts.textContent = g.phases.length ? `${g.phases.length} ${g.phases.length === 1 ? "phase" : "phases"} · ${g.tasks.length} ${g.tasks.length === 1 ? "task" : "tasks"}${g.milestones.length ? ` · ${g.milestones.length} milestones` : ""}` : "";
    const p = g.status === "ready" ? 1 : g.status === "streaming" ? Math.min(0.96, ((g.stage ? F.stageIndex(g.stage) : 0) + Math.min(1, g.tasks.length / 24)) / F.STAGES.length) : 0;
    pl.style.transform = `scaleX(${p})`;
    pl.style.opacity = g.status === "ready" ? "0" : ".7";
    document.getElementById("stop").textContent = g.status === "streaming" ? "Stop" : "Edit";
  }

  function drawGraphShell() {
    const frags = [[6, 18, 72, 10, -6], [30, 6, 44, -8, 8], [58, 22, 96, 6, 10], [80, 8, 52, -10, 4], [14, 58, 88, 8, -8], [44, 48, 60, -6, -10], [70, 64, 76, 10, 6], [36, 82, 40, -8, -4]];
    document.getElementById("graph").innerHTML = `
      <svg class="links" id="links"></svg>
      <div class="goal" data-node="goal"><p class="eyebrow">Goal</p><div id="goalt"><div class="shimmer"></div></div></div>
      <div class="fragments" id="frags" aria-hidden="true">${frags.map(([x, y, w, dx, dy], i) => `<span style="left:${x}%;top:${y}%;width:${w}px;--dx:${dx}px;--dy:${dy}px;animation-delay:${i * 0.15}s"></span>`).join("")}</div>
      <div class="cols" id="cols"></div>
      <div class="strip-slot" id="stripslot"></div>`;
  }
  function setGoal(title) { document.getElementById("goalt").innerHTML = `<p class="t">${esc(title)}</p>`; }
  function addPhase(p) {
    const fr = document.getElementById("frags");
    if (fr) { fr.style.opacity = "0"; setTimeout(() => fr.remove(), 400); }
    const cols = document.getElementById("cols");
    const n = Math.min(S.gen.phases.length, 6);
    cols.style.setProperty("--cols", n);
    if (S.gen.phases.length > 6) return;
    const col = document.createElement("div");
    col.className = "col";
    col.dataset.phase = p.id;
    col.innerHTML = `<div class="phase-node" data-node="phase:${p.id}"><p class="n">Phase ${S.gen.phases.length}</p><p class="t">${esc(p.title)}</p><p class="d num">${esc(D.formatRange(p.startDate, p.endDate))}</p></div><div class="cards"></div><span class="more"></span>`;
    cols.appendChild(col);
    links();
  }
  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function addTask(t) {
    const col = document.querySelector(`.col[data-phase="${t.phaseId}"]`);
    if (!col) return;
    const cards = col.querySelector(".cards");
    const all = S.gen.tasks.filter((x) => x.phaseId === t.phaseId).length;
    if (all > 4) { col.querySelector(".more").textContent = `+${all - 4} more`; return; }
    const h = hash(t.id);
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.node = "task:" + t.id;
    el.style.cssText = `--sx:${(h % 57) - 28}px;--sy:${12 + (h % 23)}px;--sr:${((h % 11) - 5) * 0.9}deg`;
    el.innerHTML = `<div class="t"><i class="${t.priority === "high" ? "high" : ""}"></i><span>${esc(t.title)}</span></div><p class="d num">Due ${esc(D.formatShort(t.dueDate))}</p>`;
    cards.appendChild(el);
    const wrap = document.getElementById("gwrap");
    if (wrap.scrollHeight > wrap.clientHeight) wrap.scrollTo({ top: wrap.scrollHeight, behavior: "smooth" });
    links();
  }
  let linkTimer = 0;
  function links() {
    clearTimeout(linkTimer);
    linkTimer = setTimeout(() => {
      const g = document.getElementById("graph"), svg = document.getElementById("links");
      if (!g || !svg) return;
      if (matchMedia("(max-width: 760px)").matches) { svg.innerHTML = ""; return; }
      const base = g.getBoundingClientRect();
      const r = (id) => { const el = g.querySelector(`[data-node="${id}"]`); if (!el) return null; const b = el.getBoundingClientRect(); return { l: b.left - base.left, t: b.top - base.top, r: b.right - base.left, b: b.bottom - base.top }; };
      const goal = r("goal");
      let out = "";
      const order = S.gen.phases.slice(0, 6).map((p) => p.id);
      for (const id of order) {
        const p = r("phase:" + id);
        if (!goal || !p) continue;
        const sx = (goal.l + goal.r) / 2, sy = goal.b, ex = (p.l + p.r) / 2, ey = p.t, my = (sy + ey) / 2;
        out += `<path d="M${sx},${sy} C${sx},${my} ${ex},${my} ${ex},${ey}" fill="none" stroke="var(--border-strong)"/>`;
      }
      for (const t of S.gen.tasks) for (const dep of t.dependsOn) {
        const src = S.gen.tasks.find((x) => x.id === dep);
        if (!src || Math.abs(order.indexOf(src.phaseId) - order.indexOf(t.phaseId)) > 1) continue;
        const a = r("task:" + dep), b = r("task:" + t.id);
        if (!a || !b) continue;
        const ay = (a.t + a.b) / 2, by = (b.t + b.b) / 2;
        let d;
        if (b.l > a.r - 4) { const mx = (a.r + b.l) / 2; d = `M${a.r},${ay} C${mx},${ay} ${mx},${by} ${b.l},${by}`; }
        else { const x = Math.min(a.l, b.l); d = `M${x},${ay} C${x - 12},${ay} ${x - 12},${by} ${x},${by}`; }
        out += `<path d="${d}" fill="none" stroke="var(--accent-line)"/>`;
      }
      svg.innerHTML = out;
    }, 600);
  }
  function drawStrip() {
    const g = S.gen;
    const start = g.meta?.startDate ?? g.phases[0]?.startDate;
    if (!start) return;
    const ends = [g.meta?.endDate, ...g.phases.map((p) => p.endDate), ...g.milestones.map((m) => m.date)].filter(Boolean);
    const end = ends.reduce(D.maxDate, D.addDays(start, 6));
    const slot = document.getElementById("stripslot");
    if (!slot) return;
    const fresh = !slot.firstChild;
    slot.innerHTML = strip(start, end, g.phases, g.milestones, false, !fresh);
  }
  function strip(start, end, phases, milestones, showToday, staticAnim) {
    const span = Math.max(1, D.diffDays(end, start) + 1);
    const pos = (d) => Math.min(100, Math.max(0, (D.diffDays(d, start) / span) * 100));
    const weeks = Math.max(1, Math.ceil(span / 7));
    const every = weeks <= 6 ? 1 : Math.ceil(weeks / 6);
    const today = D.localToday();
    return `<div class="strip ${staticAnim ? "static" : ""}"><div class="track"><span class="base"></span>
      ${phases.map((p, i) => { const l = pos(p.startDate); const w = Math.max(1.5, pos(p.endDate) + 100 / span - l); return `<span class="seg" title="${esc(p.title)}" style="left:${l}%;width:calc(${w}% - 3px);background:${i % 2 ? "var(--accent-line)" : "var(--accent)"};opacity:${i % 2 ? 0.55 : 0.75};animation-delay:${0.15 + i * 0.08}s"></span>`; }).join("")}
      ${milestones.map((m, i) => `<span class="ms" title="${esc(m.title)} · ${esc(D.formatShort(m.date))}" style="left:${pos(m.date)}%;animation-delay:${0.3 + i * 0.06}s"></span>`).join("")}
      ${showToday && today >= start && today <= end ? `<span class="today" style="left:${pos(today)}%"></span>` : ""}
      </div><div class="weeks num">${Array.from({ length: weeks }, (_, w) => w).filter((w) => w % every === 0).map((w) => `<span style="left:${Math.min(92, (w * 700) / span)}%">Week ${w + 1}</span>`).join("")}</div></div>`;
  }
  function showError(msg) {
    document.getElementById("canvas").setAttribute("aria-busy", "false");
    document.getElementById("gwrap").innerHTML = `<div class="center-msg" role="alert"><h3>${esc(msg)}</h3><p>Your prompt is safe. Try again, or adjust it first.</p>
      <div class="row"><button class="btn primary" data-a="retry">Try again</button><button class="btn secondary" data-a="edit">Edit prompt</button></div></div>`;
    updateStatus();
  }
  function showClarify(c) {
    updateStatus();
    document.getElementById("gwrap").innerHTML = `<div class="center-msg"><h3>${esc(c.question)}</h3>
      <div class="row">${c.options.map((o) => `<button class="btn secondary" data-a="answer" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>
      <form class="row" id="clar" style="width:100%;max-width:420px"><input class="field" id="clar-in" style="flex:1" placeholder="Or answer in your own words" aria-label="Your answer"><button class="btn primary" type="submit">Continue</button></form></div>`;
    document.getElementById("clar").addEventListener("submit", (e) => { e.preventDefault(); const v = document.getElementById("clar-in").value.trim(); if (v) answer(v); });
  }
  function answer(v) { const g = S.gen; startGeneration({ ...g.req, clarification: { question: g.clarify.question, answer: v } }, null); }

  function ready(g) {
    const canvas = document.getElementById("canvas");
    canvas.classList.add("ready");
    canvas.setAttribute("aria-busy", "false");
    setStage("finalizing");
    drawStrip();
    S.records = [{ plan: g.plan, chat: [] }, ...S.records.filter((r) => r.plan.id !== g.plan.id)];
    saveStore(S.records);
    setTimeout(() => { if (S.gen === g && S.screen === "gen") openWorkspace(g.plan, [], canvas.getBoundingClientRect()); }, 1500);
  }

  /* ---------- workspace ---------- */
  function openWorkspace(plan, chat, fromRect) {
    S.screen = "ws"; S.plan = plan; S.chat = chat; S.view = "overview"; S.openTask = null; S.menu = false; S.asstOpen = false; S.pending = null;
    S.weekOf = D.startOfWeek(D.localToday() >= plan.startDate && D.localToday() <= plan.endDate ? D.localToday() : plan.startDate);
    S.undo = null;
    document.body.classList.add("in-ws");
    renderWs(true);
    if (fromRect) {
      const main = document.querySelector(".main").getBoundingClientRect();
      const ghost = document.createElement("div");
      ghost.className = "handoff";
      Object.assign(ghost.style, { top: fromRect.top + "px", left: fromRect.left + "px", width: fromRect.width + "px", height: fromRect.height + "px" });
      document.body.appendChild(ghost);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        Object.assign(ghost.style, { top: main.top + 12 + "px", left: main.left + 12 + "px", width: main.width - 24 + "px", height: Math.min(main.height, innerHeight - main.top) - 24 + "px", opacity: "0" });
      }));
      setTimeout(() => ghost.remove(), 1300);
    }
  }

  const VIEWS = [["overview", "Overview", icon.list], ["timeline", "Timeline", icon.gantt], ["calendar", "Calendar", icon.cal]];

  function renderWs(arrive) {
    const p = S.plan, pr = F.progress(p);
    const days = D.weekdayNames.short.filter((_, d) => !p.constraints.blockedWeekdays.includes(d));
    $app.innerHTML = `${topbar()}
    <div class="ws">
      <aside class="side" aria-label="Plan sections">
        <p class="ptitle" title="${esc(p.title)}">${esc(p.title)}</p>
        <div class="pbar"><span class="bar3"><b style="transform:scaleX(${pr.ratio})"></b></span><span class="num">${Math.round(pr.ratio * 100)}%</span></div>
        ${VIEWS.map(([id, label, ic]) => `<button class="v" data-a="view" data-v="${id}" ${S.view === id ? 'aria-current="page"' : ""}>${ic}${label}${id === "overview" ? `<span class="c num">${pr.total - pr.done}</span>` : ""}</button>`).join("")}
        <p class="avail">${esc(D.formatMinutes(p.constraints.dailyMinutes))} a day · ${days.length === 7 ? "Every day" : esc(days.join(" "))}</p>
      </aside>
      <main class="main" id="main">
        <div class="tabs">${VIEWS.map(([id, label]) => `<button data-a="view" data-v="${id}" ${S.view === id ? 'aria-current="page"' : ""}>${label}</button>`).join("")}</div>
        <div class="main-in ${S.view === "overview" ? "" : "wide"} ${arrive ? "arrive" : ""}" id="view">${viewHtml()}</div>
      </main>
      <aside class="asst ${S.asstOpen ? "open" : ""}" id="asst" aria-label="Assistant">${asstHtml()}</aside>
    </div>
    <button class="fab" data-a="asst-open">${icon.wand}Ask AI</button>`;
    bindWs();
  }
  function rerenderView() {
    const el = document.getElementById("view");
    if (!el) return;
    const scroll = document.querySelector(".main")?.scrollTop;
    el.className = `main-in ${S.view === "overview" ? "" : "wide"}`;
    el.innerHTML = viewHtml();
    const side = document.querySelector(".side");
    if (side) {
      const pr = F.progress(S.plan);
      side.querySelector(".bar3 b").style.transform = `scaleX(${pr.ratio})`;
      side.querySelector(".pbar .num").textContent = Math.round(pr.ratio * 100) + "%";
      side.querySelector(".c").textContent = pr.total - pr.done;
      const days = D.weekdayNames.short.filter((_, d) => !S.plan.constraints.blockedWeekdays.includes(d));
      side.querySelector(".avail").textContent = `${D.formatMinutes(S.plan.constraints.dailyMinutes)} a day · ${days.length === 7 ? "Every day" : days.join(" ")}`;
      side.querySelector(".ptitle").textContent = S.plan.title;
    }
    if (scroll != null) document.querySelector(".main").scrollTop = scroll;
    bindView();
  }
  function viewHtml() { return S.view === "timeline" ? timelineHtml() : S.view === "calendar" ? calendarHtml() : overviewHtml(); }

  function dispatch(m) {
    try { S.plan = F.applyMutation(S.plan, m); }
    catch (e) { console.warn(e); return; }
    persist();
    rerenderView();
  }
  function persist() {
    S.records = [{ plan: S.plan, chat: S.chat }, ...S.records.filter((r) => r.plan.id !== S.plan.id)];
    saveStore(S.records);
  }

  function overviewHtml() {
    const p = S.plan, today = D.localToday(), meta = F.planMeta(p), pr = F.progress(p);
    const todays = F.focusForToday(p, today);
    const focus = todays.length ? todays : F.upNext(p);
    const mins = p.schedule.filter((s) => s.date === today).reduce((a, s) => a + s.durationMinutes, 0);
    return `
    <header>
      ${p.prompt ? `<p class="quote"><span aria-hidden="true">“</span><span title="${esc(p.prompt)}">${esc(p.prompt)}</span></p>` : ""}
      <textarea class="title-in" id="title" rows="1" aria-label="Plan title" maxlength="200">${esc(p.title)}</textarea>
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
      <div class="meta"><span>${esc(meta.span)}</span><span aria-hidden="true">·</span><span>${esc(meta.priorityLabel)}</span><span aria-hidden="true">·</span><span>${esc(meta.statusLabel)}</span><span class="s">· ${esc(D.formatRange(p.startDate, p.endDate))}</span></div>
      <div class="pg"><span class="bar1" role="progressbar" aria-valuenow="${Math.round(pr.ratio * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Plan progress"><b style="transform:scaleX(${pr.ratio})"></b></span><span class="num">${pr.done} of ${pr.total} tasks</span></div>
    </header>
    <section>
      <div class="sec-h"><h2>${p.status === "completed" ? "All done" : todays.length ? "Focus today" : "Up next"}${mins ? `<small>${esc(D.formatMinutes(mins))} scheduled</small>` : ""}</h2></div>
      ${p.status === "completed" ? `<p class="desc" style="margin:0">Every task in this plan is complete. Nicely done.</p>` : `<div class="rows">${focus.map((t) => rowHtml(t, true)).join("")}</div>`}
      ${!p.tasks.some((t) => t.status === "done") && p.nextActions.length ? `<div class="box" style="margin-top:14px"><p class="eyebrow" style="text-transform:none;letter-spacing:0;font-size:12px">Here’s how we’ll get started</p><ol>${p.nextActions.map((a, i) => `<li><b class="num">${i + 1}</b>${esc(a)}</li>`).join("")}</ol></div>` : ""}
    </section>
    <section>
      <div class="sec-h"><h2>Timeline</h2><button class="btn sm" data-a="view" data-v="timeline">Open →</button></div>
      ${strip(p.startDate, p.endDate, p.phases, p.milestones, true, true)}
    </section>
    ${p.phases.map((ph, i) => {
      const tasks = p.tasks.filter((t) => t.phaseId === ph.id);
      return `<section aria-label="${esc(ph.title)}">
        <div class="phase-h"><div><p class="k num">Phase ${i + 1} · ${esc(F.weekLabel(p.startDate, ph.startDate, ph.endDate))}</p><h3>${esc(ph.title)}</h3>${ph.summary ? `<p class="sum">${esc(ph.summary)}</p>` : ""}</div>
        <span class="r num">${esc(D.formatRange(ph.startDate, ph.endDate))} · ${tasks.filter((t) => t.status === "done").length}/${tasks.length}</span></div>
        <div class="rows">${tasks.map((t) => rowHtml(t, false)).join("")}</div>
        <form class="add-task" data-phase="${ph.id}"><span style="color:var(--fg-subtle)" aria-hidden="true">+</span><input placeholder="Add a task" aria-label="Add a task to ${esc(ph.title)}"></form>
      </section>`;
    }).join("")}
    ${p.milestones.length ? `<section><div class="sec-h"><h2>Milestones</h2></div><ul class="ms-list">${p.milestones.map((m) => `<li><span></span><span>${esc(m.title)}</span><span class="num">${esc(D.formatShort(m.date))}</span></li>`).join("")}</ul></section>` : ""}
    ${p.assumptions.length || p.risks.length ? `<div class="two">
      ${p.assumptions.length ? `<section><div class="sec-h"><h2>Assumptions</h2></div><ul>${p.assumptions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></section>` : "<span></span>"}
      ${p.risks.length ? `<section><div class="sec-h"><h2>Risks to watch</h2></div><ul>${p.risks.map((r) => `<li><span class="rt">${esc(r.title)}</span>${r.mitigation ? `<br>${esc(r.mitigation)}` : ""}</li>`).join("")}</ul></section>` : ""}
    </div>` : ""}`;
  }

  function rowHtml(t, compact) {
    const p = S.plan, today = D.localToday();
    const done = t.status === "done", blocked = F.isBlocked(t, p), late = F.isOverdue(t, today);
    const open = S.openTask === t.id && !compact;
    const steps = t.subtasks.length ? `<span class="num">${t.subtasks.filter((s) => s.done).length}/${t.subtasks.length} steps</span>` : "";
    return `<div class="row ${done ? "done" : ""} ${open ? "open" : ""}">
      <div class="row-main">
        <button class="check ${done ? "on" : ""}" data-a="toggle" data-id="${t.id}" role="checkbox" aria-checked="${done}" aria-label="Mark “${esc(t.title)}” ${done ? "not done" : "done"}">${icon.check}</button>
        <button class="row-body" data-a="${compact ? "noop" : "expand"}" data-id="${t.id}" aria-expanded="${open}">
          <span class="t">${esc(t.title)}</span>
          ${!compact && t.description && !done ? `<span class="ds">${esc(t.description)}</span>` : ""}
          <span class="m"><span class="${late ? "late" : ""} num">${late ? "Overdue · " : "Due "}${esc(D.formatShort(t.dueDate))}</span><span class="num">${esc(D.formatMinutes(t.estimatedMinutes))}</span>${t.priority === "high" && !done ? `<span class="hi">● High</span>` : ""}${steps}${blocked.length ? `<span>Waiting on ${blocked.length === 1 ? "“" + esc(blocked[0].title.slice(0, 28)) + (blocked[0].title.length > 28 ? "…" : "") + "”" : blocked.length + " tasks"}</span>` : ""}</span>
        </button>
      </div>
      ${open ? `<div class="editor">
        <label>Start<input class="field" type="date" data-f="startDate" data-id="${t.id}" value="${t.startDate}"></label>
        <label>Due<input class="field" type="date" data-f="dueDate" data-id="${t.id}" value="${t.dueDate}" min="${t.startDate}"></label>
        <label>Effort<select class="field" data-f="estimatedMinutes" data-id="${t.id}">${[...new Set([15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, t.estimatedMinutes])].sort((a, b) => a - b).map((m) => `<option value="${m}" ${m === t.estimatedMinutes ? "selected" : ""}>${D.formatMinutes(m)}</option>`).join("")}</select></label>
        <label>Priority<select class="field" data-f="priority" data-id="${t.id}">${["low", "medium", "high"].map((v) => `<option value="${v}" ${v === t.priority ? "selected" : ""}>${v[0].toUpperCase() + v.slice(1)}</option>`).join("")}</select></label>
        <div class="acts"><button class="btn sm secondary" data-a="ask" data-id="${t.id}">${icon.wand}Ask AI to modify</button><button class="btn sm secondary" data-a="dup" data-id="${t.id}">Duplicate</button><button class="btn sm danger" data-a="del" data-id="${t.id}">Delete</button></div>
      </div>` : ""}
    </div>`;
  }

  function timelineHtml() {
    const p = S.plan, today = D.localToday();
    const start = D.addDays(p.startDate, -1), end = D.addDays(p.endDate, 4);
    const span = D.diffDays(end, start) + 1;
    const dw = span <= 35 ? 30 : span <= 100 ? 16 : span <= 200 ? 8 : 5;
    const width = span * dw, x = (d) => D.diffDays(d, start) * dw;
    const rows = [];
    p.phases.forEach((ph, i) => { rows.push({ ph, i }); p.tasks.filter((t) => t.phaseId === ph.id).forEach((t) => rows.push({ t })); });
    const weeks = []; for (let d = p.startDate; d <= end; d = D.addDays(d, 7)) weeks.push(d);
    const H = 42, R = 34;
    return `<div class="vh"><div><h1>Timeline</h1><p>Change a date and dependent tasks move with it.</p></div>
      <div class="ctrls"><label>Start<input class="field" type="date" data-plan="start" value="${p.startDate}"></label><label>Deadline<input class="field" type="date" data-plan="deadline" value="${p.endDate}" min="${D.addDays(p.startDate, 1)}"></label><span style="font-size:12px;color:var(--fg-subtle);padding-bottom:10px">${esc(D.formatSpan(p.startDate, p.endDate))}</span></div></div>
    <div class="gantt">
      <div class="g-labels"><div class="g-head"></div>${rows.map((r) => r.ph ? `<div class="g-row ph"><span style="color:var(--accent);margin-right:6px" class="num">${r.i + 1}</span>${esc(r.ph.title)}</div>` : `<div class="g-row tk ${r.t.status === "done" ? "dn" : ""}" data-a="goto" data-id="${r.t.id}" title="${esc(r.t.title)}">${esc(r.t.title)}</div>`).join("")}</div>
      <div class="g-chart"><div style="position:relative;width:${width}px;height:${H + rows.length * R}px">
        ${weeks.map((w) => `<div style="position:absolute;top:0;bottom:0;left:${x(w)}px;border-left:1px solid var(--border)"><div style="padding:6px 8px;font-size:11px;line-height:1.3;color:var(--fg-subtle);white-space:nowrap"><b style="font-weight:500;color:var(--fg-muted)">${esc(D.formatShort(w))}</b><br>Week ${Math.floor(D.diffDays(w, p.startDate) / 7) + 1}</div></div>`).join("")}
        <div style="position:absolute;left:0;right:0;top:${H}px;border-top:1px solid var(--border)"></div>
        ${today >= start && today <= end ? `<div style="position:absolute;top:${H - 4}px;bottom:0;left:${x(today) + dw / 2}px;width:1px;background:var(--danger);opacity:.7"></div>` : ""}
        ${rows.map((r, i) => {
          const top = H + i * R;
          if (r.ph) return `<div style="position:absolute;left:0;right:0;top:${top}px;height:${R}px;background:color-mix(in oklab,var(--surface-2) 60%,transparent)"></div><div style="position:absolute;top:${top + R / 2 - 2}px;height:4px;border-radius:9px;background:var(--accent-soft);box-shadow:inset 0 0 0 1px var(--accent-line);left:${x(r.ph.startDate)}px;width:${(D.diffDays(r.ph.endDate, r.ph.startDate) + 1) * dw}px"></div>`;
          const w = (D.diffDays(r.t.dueDate, r.t.startDate) + 1) * dw;
          return `<div class="bar ${r.t.status === "done" ? "done" : r.t.priority}" style="top:${top + 7}px;left:${x(r.t.startDate)}px;width:${w}px" title="${esc(r.t.title)} · ${esc(D.formatShort(r.t.startDate))} – ${esc(D.formatShort(r.t.dueDate))}">${w > 70 ? esc(r.t.title) : ""}</div>`;
        }).join("")}
      </div></div>
    </div>`;
  }

  function calendarHtml() {
    const p = S.plan, today = D.localToday();
    const days = Array.from({ length: 7 }, (_, i) => D.addDays(S.weekOf, i));
    const byTask = new Map(p.tasks.map((t) => [t.id, t]));
    return `<div class="vh"><div><h1>Calendar</h1><p>Work sessions are scheduled from each task’s effort, deadline and dependencies.</p></div></div>
    <div class="avail-box"><label style="display:flex;gap:10px;align-items:center">Daily time<select class="field" id="daily">${[...new Set([15, 30, 45, 60, 90, 120, 180, 240, 360, 480, p.constraints.dailyMinutes])].sort((a, b) => a - b).map((m) => `<option value="${m}" ${m === p.constraints.dailyMinutes ? "selected" : ""}>${D.formatMinutes(m)}</option>`).join("")}</select></label>
      <span style="display:flex;gap:10px;align-items:center">Working days<span class="days" role="group" aria-label="Working days">${D.weekdayNames.short.map((n, d) => `<button data-a="day" data-d="${d}" aria-pressed="${!p.constraints.blockedWeekdays.includes(d)}" aria-label="${D.weekdayNames.long[d]}">${n[0]}</button>`).join("")}</span></span></div>
    <div class="weeknav"><button class="btn sm secondary" data-a="wk" data-d="-7" aria-label="Previous week">←</button><button class="btn sm secondary" data-a="wk" data-d="7" aria-label="Next week">→</button><button class="btn sm" data-a="wk" data-d="0">Today</button><h2 class="num">${esc(D.formatShort(days[0]))} – ${esc(D.formatShort(days[6]))}</h2></div>
    <div class="week"><div class="week-in">${days.map((d) => {
      const items = p.schedule.filter((s) => s.date === d);
      const off = p.constraints.blockedWeekdays.includes(D.weekday(d));
      const total = items.reduce((a, s) => a + s.durationMinutes, 0);
      return `<div class="wd ${off ? "off" : ""}"><div class="wd-h"><p>${D.weekdayNames.short[D.weekday(d)]}</p><p class="n num ${d === today ? "today" : ""}">${D.parseDate(d).getUTCDate()}</p><p class="num">${off ? "Off" : total ? D.formatMinutes(total) : "—"}</p></div>
        ${items.map((s) => { const t = byTask.get(s.taskId); return t ? `<div class="sess ${t.status === "done" ? "dn" : ""}"><small class="num">${D.formatClock(s.startMinute)} · ${D.formatMinutes(s.durationMinutes)}</small>${esc(t.title)}</div>` : ""; }).join("")}</div>`;
    }).join("")}</div></div>`;
  }

  /* ---------- assistant ---------- */
  const SUGG = ["What should I do today?", "Make this less overwhelming.", "I only have 45 minutes per day.", "I can’t work Fridays."];
  function md(text) {
    const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    let html = "", list = null;
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      const b = /^[-*•]\s+(.*)$/.exec(line), n = /^\d+[.)]\s+(.*)$/.exec(line);
      if (b || n) { const kind = b ? "ul" : "ol"; if (list !== kind) { close(); html += `<${kind}>`; list = kind; } html += `<li>${inline((b || n)[1])}</li>`; }
      else if (!line) close();
      else { close(); html += `<p>${inline(line.replace(/^#+\s*/, ""))}</p>`; }
    }
    close();
    return html;
  }
  function asstHtml() {
    return `<div class="asst-h"><b>Assistant</b><span>Ask AI about this plan</span><button class="btn sm x" data-a="asst-close" aria-label="Close assistant">✕</button></div>
      <div class="msgs" id="msgs" aria-live="polite">${msgsHtml()}</div>
      <form id="ask"><div class="inbox"><label for="ask-in" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Message the assistant</label><textarea id="ask-in" rows="1" placeholder="Adjust the plan…" maxlength="4000"></textarea><button class="go" type="submit" aria-label="Send" ${S.pending ? "disabled" : ""}>${icon.up}</button></div></form>`;
  }
  function msgsHtml() {
    let h = "";
    if (!S.chat.length && !S.pending) h += `<div class="intro"><h3>What should happen next?</h3><p>I can reschedule, simplify, add or remove work, and answer questions using the actual plan.</p><div class="sugg">${SUGG.map((s) => `<button data-a="sugg" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div></div>`;
    S.chat.forEach((m, i) => {
      h += m.role === "user" ? `<div class="msg-u">${esc(m.content)}</div>` : `<div class="msg-a">${md(m.content)}${m.changes?.length ? `<div class="changes">${m.changes.map((c) => `<span class="ok">${esc(c)}</span>`).join("")}${S.undo && S.undo.index === i ? `<button class="undo" data-a="undo">Undo these changes</button>` : ""}</div>` : ""}</div>`;
    });
    if (S.pending) h += `<div class="msg-u">${esc(S.pending)}</div><div class="thinking"><span class="dots"><i></i><i></i><i></i></span>Looking at your plan…</div>`;
    if (S.asstError) h += `<p class="thinking" role="alert" style="color:var(--danger)">${esc(S.asstError)}</p>`;
    return h;
  }
  function refreshMsgs() {
    const el = document.getElementById("msgs");
    if (!el) return;
    el.innerHTML = msgsHtml();
    el.scrollTop = el.scrollHeight;
    const go = document.querySelector("#ask .go");
    if (go) go.disabled = Boolean(S.pending);
  }
  async function ask(text) {
    const message = text.trim();
    if (!message || S.pending) return;
    if (!sample) { S.asstError = "Claude isn’t available in this view."; refreshMsgs(); return; }
    S.pending = message; S.asstError = null;
    refreshMsgs();
    const instructions = `${F.ASSISTANT_SYSTEM_PROMPT}\n\n${F.assistantStyleNote(PREFS.responseStyle)}\n\nReply with only a JSON object {"reply": string, "operations": [ ... ]}. Each operation has exactly these keys: type, taskId, phaseId, title, description, priority, startDate, dueDate, estimatedMinutes, dependsOn, dailyMinutes, blockedWeekdays, date — use null for keys that don't apply.`;
    const turns = [{ role: "user", content: instructions }];
    for (const m of S.chat.slice(-12)) turns.push({ role: m.role, content: m.content });
    turns.push({ role: "user", content: `<plan>\n${F.serializePlanForAssistant(S.plan, D.localToday())}\n</plan>\n\n${message}` });
    try {
      const raw = await sample.json(turns, { cache: false });
      const parsed = F.AssistantResponse.safeParse(normalizeOps(raw));
      if (!parsed.success) throw { code: "invalid_json" };
      const before = S.plan;
      let plan = S.plan; const changes = [];
      for (const op of parsed.data.operations) {
        const conv = F.toMutation(plan, op);
        if (!conv) continue;
        try { plan = F.applyMutation(plan, conv.mutation); changes.push(conv.summary); } catch (e) { console.warn("skipped", op.type, e); }
      }
      const summary = F.collapse(changes);
      S.chat.push({ role: "user", content: message }, { role: "assistant", content: parsed.data.reply.trim(), changes: summary });
      if (summary.length) { S.plan = plan; S.undo = { plan: before, index: S.chat.length - 1 }; }
      S.pending = null;
      persist();
      refreshMsgs();
      if (summary.length) rerenderView();
    } catch (e) {
      S.pending = null;
      S.asstError = e?.code === "invalid_json" ? "The assistant’s answer couldn’t be read. Try asking again." : errorCopy(e?.code).replace("building your plan", "answering");
      refreshMsgs();
      const input = document.getElementById("ask-in");
      if (input && !input.value) input.value = message;
    }
  }
  /** Tolerate operations with missing keys by filling them with null. */
  function normalizeOps(raw) {
    const keys = ["taskId", "phaseId", "title", "description", "priority", "startDate", "dueDate", "estimatedMinutes", "dependsOn", "dailyMinutes", "blockedWeekdays", "date"];
    if (!raw || typeof raw !== "object") return raw;
    return { reply: String(raw.reply ?? ""), operations: Array.isArray(raw.operations) ? raw.operations.map((o) => { const out = { type: o?.type }; for (const k of keys) out[k] = o?.[k] ?? null; return out; }) : [] };
  }

  /* ---------- events ---------- */
  function bindWs() {
    bindView();
    const form = document.getElementById("ask"), input = document.getElementById("ask-in");
    const grow = () => { input.style.height = "0px"; input.style.height = Math.min(input.scrollHeight, 140) + "px"; };
    input.addEventListener("input", grow);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener("submit", (e) => { e.preventDefault(); const v = input.value; input.value = ""; grow(); ask(v); });
    document.getElementById("msgs").scrollTop = 1e6;
  }
  function bindView() {
    const title = document.getElementById("title");
    if (title) {
      const fit = () => { title.style.height = "0px"; title.style.height = title.scrollHeight + "px"; };
      fit();
      title.addEventListener("input", () => { title.value = title.value.replace(/\n/g, ""); fit(); });
      title.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); title.blur(); } if (e.key === "Escape") { title.value = S.plan.title; title.blur(); } });
      title.addEventListener("blur", () => { const v = title.value.trim(); if (v && v !== S.plan.title) dispatch({ type: "plan.update", patch: { title: v } }); else title.value = S.plan.title; });
    }
    document.querySelectorAll(".add-task").forEach((f) => f.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = f.querySelector("input").value.trim();
      if (v) dispatch({ type: "task.add", task: F.createBlankTask(S.plan, f.dataset.phase, uid(), v.slice(0, 300)) });
    }));
    document.querySelectorAll("[data-f]").forEach((el) => el.addEventListener("change", () => {
      const f = el.dataset.f;
      if (!el.value) return;
      dispatch({ type: "task.update", taskId: el.dataset.id, patch: { [f]: f === "estimatedMinutes" ? Number(el.value) : el.value } });
    }));
    document.querySelectorAll("[data-plan]").forEach((el) => el.addEventListener("change", () => {
      if (!el.value) return;
      dispatch(el.dataset.plan === "start" ? { type: "plan.start", startDate: el.value } : { type: "plan.deadline", endDate: el.value });
    }));
    const daily = document.getElementById("daily");
    if (daily) daily.addEventListener("change", () => dispatch({ type: "plan.constraints", constraints: { dailyMinutes: Number(daily.value) } }));
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-a]");
    if (!el) { if (S.menu && !e.target.closest(".menu")) { S.menu = false; document.querySelector(".menu")?.remove(); document.querySelector('[data-a="menu"]')?.setAttribute("aria-expanded", "false"); } return; }
    const a = el.dataset.a, id = el.dataset.id;
    switch (a) {
      case "home":
        S.gen?.ctl?.abort(); S.gen = null; S.prompt = ""; S.heading = pick(S.heading); S.menu = false; renderHome(); break;
      case "menu": {
        S.menu = !S.menu;
        const nav = el.closest("nav");
        nav.querySelector(".menu")?.remove();
        if (S.menu) nav.insertAdjacentHTML("beforeend", historyMenu());
        el.setAttribute("aria-expanded", String(S.menu));
        break;
      }
      case "open": { const r = S.records.find((x) => x.plan.id === id); S.gen?.ctl?.abort(); S.gen = null; if (r) openWorkspace(r.plan, r.chat || [], null); break; }
      case "chip": applyChip(Number(el.dataset.i)); break;
      case "stop": case "edit":
        S.gen?.ctl?.abort(); S.prompt = S.gen?.req.prompt ?? S.prompt; S.gen = null; renderHome(); break;
      case "retry": startGeneration(S.gen.req, null); break;
      case "answer": answer(el.dataset.v); break;
      case "view":
        S.view = el.dataset.v; S.openTask = null;
        document.querySelectorAll('[data-a="view"]').forEach((b) => (b.dataset.v === S.view ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
        rerenderView(); document.querySelector(".main").scrollTop = 0; break;
      case "toggle": dispatch({ type: "task.toggle", taskId: id }); break;
      case "expand": S.openTask = S.openTask === id ? null : id; rerenderView(); break;
      case "goto": S.view = "overview"; S.openTask = id; renderWs(false); setTimeout(() => document.querySelector(".row.open")?.scrollIntoView({ block: "center", behavior: "smooth" }), 50); break;
      case "dup": dispatch({ type: "task.duplicate", taskId: id, newId: uid() }); break;
      case "del": S.openTask = null; dispatch({ type: "task.delete", taskId: id }); break;
      case "ask": {
        const t = S.plan.tasks.find((x) => x.id === id);
        S.asstOpen = true; document.getElementById("asst").classList.add("open");
        const input = document.getElementById("ask-in"); input.value = `For the task “${t.title}”: `; input.focus(); break;
      }
      case "day": {
        const d = Number(el.dataset.d), b = S.plan.constraints.blockedWeekdays;
        const next = b.includes(d) ? b.filter((x) => x !== d) : [...b, d].sort();
        if (next.length < 7) dispatch({ type: "plan.constraints", constraints: { blockedWeekdays: next } });
        break;
      }
      case "wk": S.weekOf = Number(el.dataset.d) === 0 ? D.startOfWeek(D.localToday()) : D.addDays(S.weekOf, Number(el.dataset.d)); rerenderView(); break;
      case "sugg": ask(el.dataset.v); break;
      case "undo": if (S.undo) { S.plan = S.undo.plan; S.chat[S.undo.index] = { ...S.chat[S.undo.index], changes: [...S.chat[S.undo.index].changes, "Undone"] }; S.undo = null; persist(); refreshMsgs(); rerenderView(); } break;
      case "asst-open": S.asstOpen = true; document.getElementById("asst").classList.add("open"); document.getElementById("ask-in")?.focus(); break;
      case "asst-close": S.asstOpen = false; document.getElementById("asst").classList.remove("open"); break;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.menu) { S.menu = false; document.querySelector(".menu")?.remove(); }
    if (e.key === "/" && S.screen === "home" && !e.target.closest("input, textarea, select")) { e.preventDefault(); document.getElementById("prompt")?.focus(); }
  });
  let rz = 0;
  addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (S.screen === "gen") links(); }, 150); });

  renderHome();
})();
