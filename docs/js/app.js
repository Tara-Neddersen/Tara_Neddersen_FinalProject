/* CHEM 121 Orgo Study Hub - app logic (vanilla JS, no build step). */

const STORE_KEY = "chem121_hub_v1";

/* ---------- persistence ---------- */
function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
const state = Object.assign(
  { planDone: {}, planPages: {}, cards: {}, quizBest: {}, srs: {}, customCards: [], customQuiz: [] },
  loadState()
);
// ensure newer fields exist for progress saved by older versions
state.srs = state.srs || {};
state.customCards = state.customCards || [];
state.customQuiz = state.customQuiz || [];

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const topicById = (id) => TOPICS.find((t) => t.id === id);
const EXTRA_TOPIC = { ai: "AI generated", all: "All topics" };
const topicTitle = (id) => (topicById(id) ? topicById(id).title : EXTRA_TOPIC[id] || id);

/* ---------- text-to-speech (listenable lessons) ---------- */
const ttsOK = typeof window !== "undefined" && "speechSynthesis" in window;
function speak(text) {
  if (!ttsOK) {
    alert("Audio isn't supported in this browser.");
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  window.speechSynthesis.speak(u);
}
function stopSpeak() {
  if (ttsOK) window.speechSynthesis.cancel();
}

/* ---------- spaced repetition (SM-2 style) ---------- */
function addDays(iso, n) {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
}
function allCards() {
  return FLASHCARDS.concat(state.customCards || []);
}
function isDue(card) {
  const s = state.srs[card.id];
  return !s || s.due <= todayISO();
}
function dueRank(card) {
  const s = state.srs[card.id];
  if (!s) return 1; // brand-new cards come after anything already due
  return s.due <= todayISO() ? 0 : 2;
}
function scheduleCard(card, rating) {
  const t = todayISO();
  const s = state.srs[card.id] || { ease: 2.5, interval: 0, reps: 0, due: t };
  if (rating === "again") {
    s.reps = 0;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
  } else if (rating === "hard") {
    s.interval = s.reps ? Math.max(1, Math.round(s.interval * 1.2)) : 1;
    s.ease = Math.max(1.3, s.ease - 0.15);
    s.reps++;
  } else if (rating === "good") {
    s.interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * s.ease);
    s.reps++;
  } else {
    s.interval = s.reps === 0 ? 2 : Math.round(s.interval * s.ease * 1.3);
    s.ease += 0.15;
    s.reps++;
  }
  s.due = addDays(t, s.interval);
  state.srs[card.id] = s;
  saveState();
}
function masteredCount() {
  return Object.values(state.srs).filter((s) => s.interval >= 21).length;
}

function isoOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayISO() {
  return isoOf(new Date());
}
function fmtDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/* ---------- build the dated schedule from WEEKLY_PLAN ---------- */
function buildSchedule() {
  const [sy, sm, sd] = COURSE_START.split("-").map(Number);
  const examByDate = {};
  COURSE.exams.forEach((e) => (examByDate[e.date] = e));
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const weeks = [];
  WEEKLY_PLAN.forEach((wk) => {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(sy, sm - 1, sd + (wk.week - 1) * 7 + d);
      const iso = isoOf(date);
      const dd = wk.days[d] || "";
      const taskRaw = typeof dd === "string" ? dd : dd.task || "";
      const pagesRaw = typeof dd === "string" ? "" : dd.pages || "";
      const chRaw = typeof dd === "string" ? "" : dd.ch || "";
      const exam = examByDate[iso];
      days.push({
        id: iso,
        date: iso,
        dow: dows[date.getDay()],
        dnum: date.getDate(),
        week: wk.week,
        topic: wk.topic,
        chapter: chRaw || wk.chapter,
        task: exam ? `${exam.name} - ${exam.time}, ${exam.location}` : taskRaw,
        pages: exam ? "" : pagesRaw,
        type: exam ? "exam" : taskRaw ? "study" : "off",
        exam: exam || null,
      });
    }
    weeks.push({ week: wk.week, topic: wk.topic, chapter: wk.chapter, title: wk.title, days });
  });
  return weeks;
}
const SCHEDULE = buildSchedule();
const ALL_DAYS = SCHEDULE.flatMap((w) => w.days);
const STUDY_DAYS = ALL_DAYS.filter((d) => d.type === "study");

/* assign stable ids to flashcards */
FLASHCARDS.forEach((c, i) => (c.id = "fc" + i));

/* ---------- routing ---------- */
const VIEWS = {
  plan: renderPlan,
  flashcards: renderFlashcards,
  quiz: renderQuiz,
  reactions: renderReactions,
  notes: renderNotes,
  ai: renderAI,
  course: renderCourse,
};
let current = "plan";

function go(view) {
  current = view;
  $$("#tabs .tab").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
  VIEWS[view]();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) go(btn.dataset.view);
});

/* first page number out of a string like "pp. 368-379" */
function firstPageNum(s) {
  const m = (s || "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
/* leading chapter number from a day's chapter field ("9", "18", "Review") */
function dayChapterNum(day) {
  const m = (day.chapter || "").match(/(\d+)/);
  return m ? m[1] : null;
}
/* {start,end} printed page range from "pp. 368-379" */
function pageRange(s) {
  const m = (s || "").match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { start: +m[1], end: +m[2] };
  const f = firstPageNum(s);
  return f ? { start: f, end: f } : null;
}
/* a "Practice problems" block for days that belong to a chapter with problems */
function practiceBlock(day, pages) {
  const ch = dayChapterNum(day);
  const info = typeof CHAPTER_PROBLEMS !== "undefined" ? CHAPTER_PROBLEMS[ch] : null;
  if (!info) return "";
  const range = pageRange(pages);
  return `
    <div class="practice">
      <div class="practice-h">Practice problems</div>
      <p>${
        range
          ? "Do the boxed PROBLEMs on " + esc(pages) + " as you read, then the"
          : "Do the"
      } end-of-chapter <strong>Additional Problems</strong> (Ch ${esc(ch)}, p. ${info.additional}). Check your work in the solutions guide.</p>
      <div class="row">
        ${range ? `<button class="btn" data-scan="${range.start}-${range.end}">List today's problems</button>` : ""}
        <button class="btn" data-prob="${info.additional}">Open problems</button>
        <button class="btn primary" data-guide-ch="${esc(ch)}">See solutions</button>
      </div>
      <div class="scan-out" style="margin-top:8px"></div>
    </div>`;
}

/* =====================================================================
   STUDY PLAN
   ===================================================================== */
function nextStudyDay() {
  return STUDY_DAYS.find((d) => !state.planDone[d.id]) || null;
}

function renderPlan() {
  const app = $("#app");
  const doneCount = STUDY_DAYS.filter((d) => state.planDone[d.id]).length;
  const total = STUDY_DAYS.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const mastered = masteredCount();
  const quizScores = Object.values(state.quizBest);
  const quizAvg = quizScores.length
    ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
    : 0;
  const next = nextStudyDay();
  const tISO = todayISO();
  const currentWeek =
    (ALL_DAYS.find((d) => d.id === tISO) || {}).week ||
    (next ? next.week : SCHEDULE[0].week);

  let html = `
    <div class="view-head">
      <h1>Your daily study plan</h1>
      <p>${esc(COURSE.code)} - ${esc(COURSE.term)}. Readings follow ${esc(
        "Jones & Fleming, Organic Chemistry (5th Ed.)"
      )}.</p>
    </div>

    <div class="stats">
      <div class="stat"><div class="num">${doneCount}/${total}</div><div class="lbl">study days done</div></div>
      <div class="stat"><div class="num">${mastered}</div><div class="lbl">cards mastered</div></div>
      <div class="stat"><div class="num">${quizAvg}%</div><div class="lbl">avg best quiz</div></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div class="row"><strong>Course progress</strong><span class="spacer"></span><span class="muted">${pct}%</span></div>
      <div class="progress" style="margin-top:8px"><span style="width:${pct}%"></span></div>
    </div>
  `;

  if (next) {
    const pages = state.planPages[next.id] || next.pages;
    html += `
      <div class="card next-card" style="margin-bottom:18px">
        <div class="eyebrow">Study next</div>
        <h2>${fmtDate(next.id)} - Week ${next.week}</h2>
        <div class="reading">${esc(next.task)}</div>
        <div class="pages-line">Pages: ${
          pages ? esc(pages) : '<span class="muted">practice / review - no new reading</span>'
        }</div>
        <div class="row" style="margin-top:14px">
          ${firstPageNum(pages) ? `<button class="btn primary" data-read="${firstPageNum(pages)}" data-read-ch="${dayChapterNum(next) || ""}">Read pages</button>` : ""}
          <button class="btn good" data-done="${next.id}">Mark done</button>
          <button class="btn" data-study-fc="${next.topic}">Flashcards</button>
          <button class="btn" data-study-quiz="${next.topic}">Quiz</button>
        </div>
      </div>`;
  } else {
    html += `<div class="card next-card" style="margin-bottom:18px"><strong>All study days complete - great work!</strong><div class="muted">Review with flashcards or a mixed quiz any time.</div></div>`;
  }

  html += SCHEDULE.map((w) => renderWeek(w, w.week === currentWeek, tISO)).join("");
  app.innerHTML = html;
  wirePlan();
}

function renderWeek(w, open, tISO) {
  const done = w.days.filter((d) => d.type === "study" && state.planDone[d.id]).length;
  const totalStudy = w.days.filter((d) => d.type === "study").length;
  const days = w.days
    .map((d) => {
      const isToday = d.id === tISO;
      const isDone = !!state.planDone[d.id];
      const cls = ["day", d.type, isDone ? "done" : ""].filter(Boolean).join(" ");
      let right = "";
      if (d.type === "exam") right = `<span class="badge exam">EXAM</span>`;
      else if (d.type === "study")
        right = `<div class="check">${isDone ? "&#10003;" : ""}</div>`;
      const todayBadge = isToday ? ` <span class="badge today">Today</span>` : "";
      const pg = state.planPages[d.id] || d.pages;
      const sub =
        d.type === "study"
          ? `<div class="sub">${esc(topicTitle(d.topic))}${pg ? " &middot; " + esc(pg) : ""}${todayBadge}</div>`
          : d.type === "exam"
          ? `<div class="sub">${todayBadge || "&nbsp;"}</div>`
          : "";
      const taskText = d.task ? esc(d.task) : "<span class='muted'>No task - rest day</span>";
      return `
        <div class="${cls}" data-day="${d.id}" data-type="${d.type}">
          <div class="date"><div class="dow">${d.dow}</div><div class="dnum">${d.dnum}</div></div>
          <div class="task">${taskText}${sub}</div>
          ${right}
        </div>`;
    })
    .join("");

  return `
    <details class="week" ${open ? "open" : ""}>
      <summary>
        <span class="wk-no">W${w.week}</span>
        <span class="wk-title">${esc(w.title)}</span>
        <span class="wk-meta">${done}/${totalStudy} done</span>
      </summary>
      ${days}
    </details>`;
}

function wirePlan() {
  // "Study next" buttons
  $$("[data-done]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = b.dataset.done;
      state.planDone[id] = !state.planDone[id];
      saveState();
      renderPlan();
    })
  );
  $$("[data-study-fc]").forEach((b) =>
    b.addEventListener("click", () => openFlashcards(b.dataset.studyFc))
  );
  $$("[data-study-quiz]").forEach((b) =>
    b.addEventListener("click", () => openQuiz(b.dataset.studyQuiz))
  );
  $$("[data-read]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      openReader(parseInt(b.dataset.read, 10), "book", b.dataset.readCh || null);
    })
  );

  // day rows -> toggle a detail panel
  $$(".day").forEach((row) => {
    row.addEventListener("click", () => {
      if (row.dataset.type === "off") return;
      toggleDayDetail(row);
    });
  });
}

function toggleDayDetail(row) {
  const existing = row.nextElementSibling;
  if (existing && existing.classList.contains("day-detail")) {
    existing.remove();
    return;
  }
  $$(".day-detail").forEach((n) => n.remove());
  const id = row.dataset.day;
  const day = ALL_DAYS.find((d) => d.id === id);
  const isDone = !!state.planDone[id];
  const pages = state.planPages[id] || day.pages || "";
  const panel = document.createElement("div");
  panel.className = "day-detail";

  if (day.type === "exam") {
    panel.innerHTML = `
      <div class="read-big"><span class="badge exam">EXAM</span> ${esc(day.task)}</div>
      <div class="muted">Make sure earlier weeks are marked done so your review is complete.</div>`;
  } else {
    panel.innerHTML = `
      <div class="read-big">${esc(day.task)}</div>
      <div class="muted">Topic: ${esc(topicTitle(day.topic))} &middot; ${esc(
      "Jones & Fleming Ch " + day.chapter
    )}</div>
      <div class="pages-edit">
        <label class="field" style="flex:1">Pages to read (from your textbook / Canvas)
          <input type="text" data-pages="${id}" value="${esc(pages)}" placeholder="e.g. pp. 612-628" />
        </label>
        <button class="btn small" data-save-pages="${id}">Save pages</button>
      </div>
      <div class="row" style="margin-top:6px">
        ${firstPageNum(pages) ? `<button class="btn primary" data-read="${firstPageNum(pages)}">Read pp.</button>` : ""}
        <button class="btn ${isDone ? "" : "good"}" data-done="${id}">${
      isDone ? "Mark not done" : "Mark done"
    }</button>
        <button class="btn" data-study-fc="${day.topic}">Study flashcards</button>
        <button class="btn" data-study-quiz="${day.topic}">Take quiz</button>
      </div>
      ${practiceBlock(day, pages)}`;
  }
  row.after(panel);

  const readBtn = $("[data-read]", panel);
  if (readBtn) readBtn.addEventListener("click", () => openReader(parseInt(readBtn.dataset.read, 10), "book", dayChapterNum(day) || null));
  const probBtn = $("[data-prob]", panel);
  if (probBtn) probBtn.addEventListener("click", () => openReader(parseInt(probBtn.dataset.prob, 10), "book", dayChapterNum(day) || null));
  const guideBtn = $("[data-guide-ch]", panel);
  if (guideBtn)
    guideBtn.addEventListener("click", () =>
      openGuideForChapter(guideBtn.dataset.guideCh, probBtn ? parseInt(probBtn.dataset.prob, 10) : undefined)
    );
  const scanBtn = $("[data-scan]", panel);
  if (scanBtn)
    scanBtn.addEventListener("click", async () => {
      const out = $(".scan-out", panel);
      const [s, e] = scanBtn.dataset.scan.split("-").map(Number);
      out.textContent = "Reading your textbook...";
      try {
        const probs = await scanProblemsOnPages(s, e);
        if (probs === null)
          out.innerHTML = `<span class="muted">Load your textbook first - tap "Open problems", pick your PDF, then come back.</span>`;
        else if (!probs.length)
          out.innerHTML = `<span class="muted">No boxed problems on these pages - do the end-of-chapter set.</span>`;
        else
          out.innerHTML = `<strong>Problems on pp. ${s}-${e}:</strong> ${probs.map(esc).join(", ")}`;
      } catch (err) {
        out.innerHTML = `<span class="muted">Could not scan: ${esc(err.message)}</span>`;
      }
    });

  const saveBtn = $("[data-save-pages]", panel);
  if (saveBtn)
    saveBtn.addEventListener("click", () => {
      const val = $("[data-pages]", panel).value.trim();
      if (val) state.planPages[id] = val;
      else delete state.planPages[id];
      saveState();
      renderPlan();
    });
  const doneBtn = $("[data-done]", panel);
  if (doneBtn)
    doneBtn.addEventListener("click", () => {
      state.planDone[id] = !state.planDone[id];
      saveState();
      renderPlan();
    });
  const fcBtn = $("[data-study-fc]", panel);
  if (fcBtn) fcBtn.addEventListener("click", () => openFlashcards(day.topic));
  const qzBtn = $("[data-study-quiz]", panel);
  if (qzBtn) qzBtn.addEventListener("click", () => openQuiz(day.topic));
}

/* =====================================================================
   FLASHCARDS
   ===================================================================== */
let fcDeck = [];
let fcPos = 0;
let fcFlipped = false;
let fcTopic = "all";

function openFlashcards(topic) {
  fcTopic = topic || "all";
  go("flashcards");
}

function buildDeck() {
  const pool = allCards().filter((c) => fcTopic === "all" || c.topic === fcTopic);
  // due cards first, then brand-new, then cards not yet due
  fcDeck = pool.slice().sort((a, b) => dueRank(a) - dueRank(b));
  fcPos = 0;
  fcFlipped = false;
}

function renderFlashcards() {
  buildDeck();
  const app = $("#app");
  const hasAI = (state.customCards || []).length > 0;
  const opts =
    ['<option value="all">All topics</option>']
      .concat(TOPICS.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`))
      .concat(hasAI ? ['<option value="ai">AI generated</option>'] : [])
      .join("");
  const dueNow = fcDeck.filter(isDue).length;
  app.innerHTML = `
    <div class="view-head"><h1>Flashcards</h1><p>Tap to flip, then rate yourself. Spaced repetition schedules each card so you review it right before you'd forget.</p></div>
    <div class="row" style="margin-bottom:8px">
      <label class="field">Topic
        <select id="fcTopic">${opts}</select>
      </label>
      <span class="badge ${dueNow ? "" : "good"}">${dueNow} due</span>
      <span class="spacer"></span>
      <button class="btn small" id="fcShuffle">Shuffle</button>
      <button class="btn small ghost" id="fcReset">Reset progress</button>
    </div>
    <div id="fcArea"></div>`;
  $("#fcTopic").value = fcTopic;
  $("#fcTopic").addEventListener("change", (e) => {
    fcTopic = e.target.value;
    buildDeck();
    drawCard();
  });
  $("#fcShuffle").addEventListener("click", () => {
    for (let i = fcDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fcDeck[i], fcDeck[j]] = [fcDeck[j], fcDeck[i]];
    }
    fcPos = 0;
    fcFlipped = false;
    drawCard();
  });
  $("#fcReset").addEventListener("click", () => {
    if (!confirm("Reset spaced-repetition progress for all flashcards?")) return;
    state.srs = {};
    state.cards = {};
    saveState();
    buildDeck();
    renderFlashcards();
  });
  drawCard();
}

function drawCard() {
  const area = $("#fcArea");
  if (!fcDeck.length) {
    area.innerHTML = `<div class="empty">No cards for this topic yet.</div>`;
    return;
  }
  if (fcPos >= fcDeck.length) {
    const mastered = fcDeck.filter((c) => (state.srs[c.id] || {}).interval >= 21).length;
    area.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>Deck complete</h2>
        <p class="muted">${mastered} of ${fcDeck.length} are well-learned (3+ week interval). Come back when more are due.</p>
        <button class="btn primary" id="fcAgain">Go through again</button>
      </div>`;
    $("#fcAgain").addEventListener("click", () => {
      buildDeck();
      drawCard();
    });
    return;
  }
  const card = fcDeck[fcPos];
  const s = state.srs[card.id];
  const statusTxt = s
    ? s.interval >= 21
      ? "well-learned"
      : "due " + fmtDate(s.due)
    : "new card";
  area.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <span class="muted">Card ${fcPos + 1} of ${fcDeck.length}</span>
      <span class="pill-tag">${esc(topicTitle(card.topic))}</span>
    </div>
    <div class="fc-stage">
      <div class="flashcard ${fcFlipped ? "flipped" : ""}" id="fcCard">
        <div class="face front">
          <span class="tag badge">Q</span>
          <div>${esc(card.front)}</div>
          <div class="hint">tap to reveal answer</div>
        </div>
        <div class="face back">
          <span class="tag badge good">A</span>
          <div>${esc(card.back)}</div>
          <div class="hint">tap to flip back</div>
        </div>
      </div>
    </div>
    <div class="row" style="justify-content:center">
      <button class="btn bad small" data-rate="again">Again</button>
      <button class="btn small" data-rate="hard">Hard</button>
      <button class="btn good small" data-rate="good">Good</button>
      <button class="btn small" data-rate="easy">Easy</button>
    </div>
    <div class="row" style="justify-content:center;margin-top:8px">
      ${ttsOK ? '<button class="btn small ghost" id="fcListen">Listen</button>' : ""}
      <span class="muted">${esc(statusTxt)}</span>
    </div>`;
  $("#fcCard").addEventListener("click", () => {
    fcFlipped = !fcFlipped;
    $("#fcCard").classList.toggle("flipped", fcFlipped);
  });
  $$("[data-rate]").forEach((b) => b.addEventListener("click", () => rate(card, b.dataset.rate)));
  const listen = $("#fcListen");
  if (listen) listen.addEventListener("click", () => speak(card.front + ". " + card.back));
}

function rate(card, rating) {
  stopSpeak();
  scheduleCard(card, rating);
  fcPos++;
  fcFlipped = false;
  drawCard();
}

/* =====================================================================
   QUIZ
   ===================================================================== */
let quizTopic = "all";
let quizList = [];
let quizIdx = 0;
let quizScore = 0;
let quizAnswered = false;

function openQuiz(topic) {
  quizTopic = topic || "all";
  go("quiz");
  startQuiz();
}

function renderQuiz() {
  const app = $("#app");
  const hasAI = (state.customQuiz || []).length > 0;
  const opts =
    ['<option value="all">Mixed (all topics)</option>']
      .concat(TOPICS.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`))
      .concat(hasAI ? ['<option value="ai">AI generated</option>'] : [])
      .join("");
  app.innerHTML = `
    <div class="view-head"><h1>Quiz</h1><p>Multiple choice with instant feedback. Your best score per topic is saved.</p></div>
    <div class="card" id="quizCard">
      <label class="field">Topic
        <select id="quizTopic">${opts}</select>
      </label>
      <div class="row" style="margin-top:14px">
        <button class="btn primary" id="quizStart">Start quiz</button>
      </div>
    </div>`;
  $("#quizTopic").value = quizTopic;
  $("#quizTopic").addEventListener("change", (e) => (quizTopic = e.target.value));
  $("#quizStart").addEventListener("click", startQuiz);
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startQuiz() {
  const fullPool = QUIZ.concat(state.customQuiz || []);
  const pool = fullPool.filter((q) => quizTopic === "all" || q.topic === quizTopic);
  quizList = shuffled(pool).slice(0, 10).map((q) => {
    const correct = q.options[q.answer];
    const options = shuffled(q.options);
    return { q, options, correctIdx: options.indexOf(correct) };
  });
  quizIdx = 0;
  quizScore = 0;
  quizAnswered = false;
  drawQuestion();
}

function drawQuestion() {
  const card = $("#quizCard");
  if (!card) {
    renderQuiz();
    return setTimeout(drawQuestion, 0);
  }
  if (!quizList.length) {
    card.innerHTML = `<div class="empty">No questions for this topic yet.</div>`;
    return;
  }
  if (quizIdx >= quizList.length) {
    const pct = Math.round((quizScore / quizList.length) * 100);
    const prev = state.quizBest[quizTopic] || 0;
    if (pct > prev) {
      state.quizBest[quizTopic] = pct;
      saveState();
    }
    card.innerHTML = `
      <div style="text-align:center">
        <h2>Score: ${quizScore}/${quizList.length} (${pct}%)</h2>
        <p class="muted">Best for ${esc(quizTopic === "all" ? "mixed quizzes" : topicTitle(quizTopic))}: ${Math.max(pct, prev)}%</p>
        <div class="row" style="justify-content:center;margin-top:10px">
          <button class="btn primary" id="quizRetry">Try again</button>
          <button class="btn" id="quizBack">Pick another topic</button>
        </div>
      </div>`;
    $("#quizRetry").addEventListener("click", startQuiz);
    $("#quizBack").addEventListener("click", renderQuiz);
    return;
  }
  const item = quizList[quizIdx];
  quizAnswered = false;
  card.innerHTML = `
    <div class="row" style="justify-content:space-between">
      <span class="muted">Question ${quizIdx + 1} of ${quizList.length}</span>
      <span class="pill-tag">${esc(topicTitle(item.q.topic))}</span>
    </div>
    <h3 style="margin:10px 0 4px">${esc(item.q.question)}</h3>
    <div class="quiz-options" id="quizOpts">
      ${item.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("")}
    </div>
    <div id="quizFeedback"></div>`;
  $$("#quizOpts .opt").forEach((b) =>
    b.addEventListener("click", () => answerQuiz(parseInt(b.dataset.i, 10)))
  );
}

function answerQuiz(i) {
  if (quizAnswered) return;
  quizAnswered = true;
  const item = quizList[quizIdx];
  const opts = $$("#quizOpts .opt");
  opts.forEach((b, idx) => {
    b.disabled = true;
    if (idx === item.correctIdx) b.classList.add("correct");
    if (idx === i && i !== item.correctIdx) b.classList.add("wrong");
  });
  if (i === item.correctIdx) quizScore++;
  const fb = $("#quizFeedback");
  fb.innerHTML = `
    <div class="explain"><strong>${i === item.correctIdx ? "Correct." : "Not quite."}</strong> ${esc(
    item.q.explanation
  )}</div>
    <div class="row" style="justify-content:flex-end;margin-top:12px">
      <button class="btn primary" id="quizNext">${
        quizIdx + 1 >= quizList.length ? "See score" : "Next question"
      }</button>
    </div>`;
  $("#quizNext").addEventListener("click", () => {
    quizIdx++;
    drawQuestion();
  });
}

/* =====================================================================
   REACTIONS
   ===================================================================== */
function renderReactions() {
  const app = $("#app");
  const opts = ['<option value="all">All topics</option>']
    .concat(TOPICS.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`))
    .join("");
  app.innerHTML = `
    <div class="view-head"><h1>Reaction library</h1><p>${REACTIONS.length} reactions. Search by name, reagent, or product.</p></div>
    <div class="row" style="margin-bottom:14px">
      <label class="field" style="flex:1">Search
        <input type="search" id="rxnSearch" placeholder="e.g. Grignard, mCPBA, ester" />
      </label>
      <label class="field">Topic
        <select id="rxnTopic">${opts}</select>
      </label>
    </div>
    <div class="grid" id="rxnList"></div>`;

  const draw = () => {
    const q = $("#rxnSearch").value.trim().toLowerCase();
    const t = $("#rxnTopic").value;
    const list = REACTIONS.filter((r) => {
      if (t !== "all" && r.topic !== t) return false;
      if (!q) return true;
      return [r.name, r.substrate, r.reagents, r.product, r.type, r.notes]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    $("#rxnList").innerHTML = list.length
      ? list.map(rxnCard).join("")
      : `<div class="empty">No reactions match your search.</div>`;
  };
  $("#rxnSearch").addEventListener("input", draw);
  $("#rxnTopic").addEventListener("change", draw);
  draw();
}

function rxnCard(r) {
  return `
    <div class="rxn">
      <h3>${esc(r.name)} <span class="pill-tag">${esc(r.type)}</span></h3>
      <div class="flow">
        <span class="chip">${esc(r.substrate)}</span>
        <span class="arrow">&rarr;</span>
        <span class="chip">${esc(r.product)}</span>
      </div>
      <div class="reagents">${esc(r.reagents)}</div>
      <div class="notes">${esc(r.notes)}</div>
      <div style="margin-top:8px"><span class="pill-tag">${esc(topicTitle(r.topic))}</span></div>
    </div>`;
}

/* =====================================================================
   NOTES
   ===================================================================== */
function noteToText(n) {
  return (
    n.title +
    ". " +
    n.sections.map((s) => s.heading + ". " + s.points.join(". ")).join(". ")
  );
}

function renderNotes() {
  const app = $("#app");
  app.innerHTML = `
    <div class="view-head"><h1>Topic notes</h1><p>Quick summaries to review before problem sets and exams.${
      ttsOK ? " Tap Listen to hear one read aloud." : ""
    }</p></div>
    <div id="notesList"></div>`;
  $("#notesList").innerHTML = NOTES.map((n, idx) => {
    const sections = n.sections
      .map(
        (s) => `
        <div class="note-section">
          <h3>${esc(s.heading)}</h3>
          <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
        </div>`
      )
      .join("");
    return `
      <details class="week" style="margin-bottom:10px">
        <summary><span class="wk-title">${esc(n.title)}</span><span class="wk-meta">${esc(
      topicTitle(n.topic)
    )}</span></summary>
        <div style="padding:0 16px 16px">
          ${ttsOK ? `<div class="row" style="margin-bottom:6px"><button class="btn small ghost" data-listen="${idx}">Listen</button><button class="btn small ghost" data-stop="1">Stop</button></div>` : ""}
          ${sections}
        </div>
      </details>`;
  }).join("");
  $$("[data-listen]").forEach((b) =>
    b.addEventListener("click", () => speak(noteToText(NOTES[+b.dataset.listen])))
  );
  $$("[data-stop]").forEach((b) => b.addEventListener("click", stopSpeak));
}

/* =====================================================================
   COURSE
   ===================================================================== */
function renderCourse() {
  const app = $("#app");
  const tISO = todayISO();
  const exams = COURSE.exams
    .map((e) => {
      const [y, m, d] = e.date.split("-").map(Number);
      const days = Math.round((new Date(y, m - 1, d) - new Date(tISO)) / 86400000);
      const rel =
        days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : days === 0 ? "today" : "past";
      return `
        <div class="exam-row">
          <strong style="min-width:96px">${esc(e.name)}</strong>
          <span>${fmtDate(e.date)} &middot; ${esc(e.time)} &middot; ${esc(e.location)}</span>
          <span class="spacer"></span>
          <span class="badge ${days === 0 ? "today" : ""}">${rel}</span>
        </div>`;
    })
    .join("");
  const grades = COURSE.grading
    .map(
      (g) => `
      <div style="margin:8px 0">
        <div class="row"><span>${esc(g.item)}</span><span class="spacer"></span><span class="muted">${g.weight}%</span></div>
        <div class="grade-bar" style="width:${g.weight * 2.2}%;max-width:100%"></div>
      </div>`
    )
    .join("");

  app.innerHTML = `
    <div class="view-head"><h1>${esc(COURSE.code)}: ${esc(COURSE.title)}</h1><p>${esc(
    COURSE.school
  )} - ${esc(COURSE.term)}</p></div>

    <div class="card" style="margin-bottom:14px">
      <dl class="kv">
        <dt>Instructors</dt><dd>${esc(COURSE.instructors.join(", "))}</dd>
        <dt>Head TA</dt><dd>${esc(COURSE.headTA)}</dd>
        <dt>Textbook</dt><dd>${esc(COURSE.textbook)}</dd>
        <dt>Lectures</dt><dd>${esc(COURSE.lectures)}</dd>
        <dt>Lab</dt><dd>${esc(COURSE.lab)}</dd>
      </dl>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h3 style="margin-top:0">Exam schedule</h3>
        ${exams}
      </div>
      <div class="card">
        <h3 style="margin-top:0">Grading</h3>
        ${grades}
      </div>
    </div>

    <div class="card" style="margin-top:14px">
      <h3 style="margin-top:0">Key policies</h3>
      <ul style="margin:0;padding-left:18px">
        ${COURSE.policies.map((p) => `<li style="margin:6px 0">${esc(p)}</li>`).join("")}
      </ul>
    </div>`;
}

/* =====================================================================
   AI TOOLS
   ===================================================================== */
let aiEditingKey = false;
let aiFormProvider = null;

async function aiGetSource() {
  const fileEl = $("#aiFile");
  const text = (($("#aiText") || {}).value || "").trim();
  if (fileEl && fileEl.files && fileEl.files[0]) {
    const f = fileEl.files[0];
    if (f.type !== "application/pdf" && !/\.pdf$/i.test(f.name))
      throw new Error("Please choose a PDF file, or paste text instead.");
    return await extractPdfText(f);
  }
  if (text) return text;
  throw new Error("Paste some text or choose a PDF first.");
}

function renderAI() {
  const app = $("#app");
  const cfg = loadAICfg();

  if (!cfg.apiKey || aiEditingKey) {
    const provId = aiFormProvider || cfg.provider || "xai";
    const prov = AI_PROVIDERS[provId];
    const provOpts = Object.values(AI_PROVIDERS)
      .map((p) => `<option value="${p.id}" ${p.id === provId ? "selected" : ""}>${esc(p.label)}</option>`)
      .join("");
    const modelVal = cfg.provider === provId && cfg.model ? cfg.model : prov.defaultModel;
    const modelSuggest = prov.models.map((m) => `<option value="${esc(m)}"></option>`).join("");
    app.innerHTML = `
      <div class="view-head"><h1>AI Tools</h1><p>Turn any chapter, your notes, or a PDF into flashcards, a quiz, or a summary.</p></div>
      <div class="card">
        <h3 style="margin-top:0">Connect an API key</h3>
        <div class="explain" style="background:rgba(251,113,133,0.10);border-color:rgba(251,113,133,0.35)">
          <strong>Heads up:</strong> your key is stored only in this browser and sent straight to the provider. Use this on your own device only, and set a spending limit on the key.
        </div>
        <label class="field" style="margin-top:12px">Provider
          <select id="aiProvider">${provOpts}</select>
        </label>
        <label class="field" style="margin-top:10px">API key
          <input type="text" id="aiKey" placeholder="${esc(prov.keyHint)}" value="${esc(cfg.apiKey || "")}" autocomplete="off" />
        </label>
        <label class="field" style="margin-top:10px">Model
          <input type="text" id="aiModel" list="aiModelList" value="${esc(modelVal)}" autocomplete="off" />
          <datalist id="aiModelList">${modelSuggest}</datalist>
        </label>
        <p class="muted" style="margin:6px 0 0">${esc(prov.note)}</p>
        <div class="row" style="margin-top:14px">
          <button class="btn primary" id="aiSave">Save</button>
          ${cfg.apiKey ? '<button class="btn ghost" id="aiCancel">Cancel</button>' : ""}
        </div>
      </div>`;
    $("#aiProvider").addEventListener("change", (e) => {
      aiFormProvider = e.target.value;
      renderAI();
    });
    $("#aiSave").addEventListener("click", () => {
      const apiKey = $("#aiKey").value.trim();
      const model = $("#aiModel").value.trim() || prov.defaultModel;
      if (!apiKey) {
        alert("Paste your API key first.");
        return;
      }
      saveAICfg({ provider: provId, apiKey, model });
      aiEditingKey = false;
      aiFormProvider = null;
      renderAI();
    });
    const cancel = $("#aiCancel");
    if (cancel)
      cancel.addEventListener("click", () => {
        aiEditingKey = false;
        aiFormProvider = null;
        renderAI();
      });
    return;
  }

  const prov = AI_PROVIDERS[cfg.provider] || AI_PROVIDERS.xai;
  const modelLabel = prov.label + " - " + (cfg.model || prov.defaultModel);
  app.innerHTML = `
    <div class="view-head"><h1>AI Tools</h1><p>Paste a chapter or your notes (or upload a PDF), then generate study material from it.</p></div>
    <div class="card" style="margin-bottom:14px">
      <label class="field">Source material
        <textarea id="aiText" rows="7" placeholder="Paste textbook text, your notes, or a problem set here..." style="resize:vertical"></textarea>
      </label>
      <div class="row" style="margin-top:10px">
        <label class="field" style="flex:1">...or upload a PDF (a chapter/section works best)
          <input type="file" id="aiFile" accept="application/pdf,.pdf" />
        </label>
        <label class="field" style="width:110px">How many
          <input type="text" id="aiCount" value="12" inputmode="numeric" />
        </label>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn primary" id="aiCards">Generate flashcards</button>
        <button class="btn primary" id="aiQuiz">Generate quiz</button>
        <button class="btn" id="aiSum">Summarize</button>
        <span class="spacer"></span>
        <button class="btn small ghost" id="aiSettings">${esc(modelLabel)} &middot; change</button>
      </div>
    </div>
    <div id="aiOut"></div>`;

  $("#aiSettings").addEventListener("click", () => {
    aiEditingKey = true;
    renderAI();
  });

  const out = $("#aiOut");
  const buttons = ["aiCards", "aiQuiz", "aiSum"];
  const setBusy = (busy, msg) => {
    buttons.forEach((id) => ($("#" + id).disabled = busy));
    if (busy) out.innerHTML = `<div class="card"><span class="muted">${esc(msg)}</span></div>`;
  };
  const count = () => Math.max(1, Math.min(30, parseInt($("#aiCount").value, 10) || 12));

  $("#aiCards").addEventListener("click", async () => {
    try {
      const source = await aiGetSource();
      setBusy(true, "Generating flashcards from your material...");
      const cards = await aiFlashcards(source, count());
      if (!cards.length) throw new Error("No cards came back. Try different text.");
      const base = "ai" + Date.now();
      const added = cards
        .filter((c) => c.front && c.back)
        .map((c, i) => ({ id: base + "_" + i, topic: "ai", front: c.front, back: c.back }));
      state.customCards = (state.customCards || []).concat(added);
      saveState();
      out.innerHTML = `
        <div class="card">
          <h3 style="margin-top:0">Added ${added.length} flashcards</h3>
          <p class="muted">They're in your "AI generated" deck and scheduled with spaced repetition.</p>
          <div class="row"><button class="btn primary" id="aiGoCards">Study them now</button></div>
        </div>
        <div class="grid" style="margin-top:12px">
          ${added
            .map(
              (c) =>
                `<div class="rxn"><div style="font-weight:600">${esc(c.front)}</div><div class="notes">${esc(
                  c.back
                )}</div></div>`
            )
            .join("")}
        </div>`;
      $("#aiGoCards").addEventListener("click", () => openFlashcards("ai"));
    } catch (e) {
      out.innerHTML = `<div class="card"><span class="badge exam">Error</span> ${esc(e.message)}</div>`;
    } finally {
      buttons.forEach((id) => ($("#" + id).disabled = false));
    }
  });

  $("#aiQuiz").addEventListener("click", async () => {
    try {
      const source = await aiGetSource();
      setBusy(true, "Writing quiz questions from your material...");
      const qs = await aiQuiz(source, count());
      const added = qs
        .filter((q) => Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => ({
          topic: "ai",
          question: q.question,
          options: q.options,
          answer: Math.max(0, Math.min(q.options.length - 1, parseInt(q.answer_index, 10) || 0)),
          explanation: q.explanation || "",
        }));
      if (!added.length) throw new Error("No questions came back. Try different text.");
      state.customQuiz = (state.customQuiz || []).concat(added);
      saveState();
      out.innerHTML = `
        <div class="card">
          <h3 style="margin-top:0">Added ${added.length} quiz questions</h3>
          <p class="muted">They're in the quiz under the "AI generated" topic.</p>
          <div class="row"><button class="btn primary" id="aiGoQuiz">Take the quiz</button></div>
        </div>`;
      $("#aiGoQuiz").addEventListener("click", () => openQuiz("ai"));
    } catch (e) {
      out.innerHTML = `<div class="card"><span class="badge exam">Error</span> ${esc(e.message)}</div>`;
    } finally {
      buttons.forEach((id) => ($("#" + id).disabled = false));
    }
  });

  $("#aiSum").addEventListener("click", async () => {
    try {
      const source = await aiGetSource();
      setBusy(true, "Summarizing your material...");
      const res = await aiSummary(source);
      const points = (res.key_points || []).map((p) => `<li>${esc(p)}</li>`).join("");
      out.innerHTML = `
        <div class="card">
          <div class="row"><h3 style="margin:0 0 8px">Summary</h3><span class="spacer"></span>${
            ttsOK
              ? '<button class="btn small ghost" id="aiListen">Listen</button><button class="btn small ghost" id="aiStop">Stop</button>'
              : ""
          }</div>
          <p>${esc(res.summary || "")}</p>
          ${points ? `<h3>Key points</h3><ul>${points}</ul>` : ""}
        </div>`;
      const listen = $("#aiListen");
      if (listen)
        listen.addEventListener("click", () =>
          speak((res.summary || "") + ". Key points. " + (res.key_points || []).join(". "))
        );
      const stop = $("#aiStop");
      if (stop) stop.addEventListener("click", stopSpeak);
    } catch (e) {
      out.innerHTML = `<div class="card"><span class="badge exam">Error</span> ${esc(e.message)}</div>`;
    } finally {
      buttons.forEach((id) => ($("#" + id).disabled = false));
    }
  });
}

/* ---------- boot ---------- */
go("plan");
