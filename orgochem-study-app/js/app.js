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
  { planDone: {}, planPages: {}, cards: {}, quizBest: {} },
  loadState()
);

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
const topicById = (id) => TOPICS.find((t) => t.id === id);
const topicTitle = (id) => (topicById(id) ? topicById(id).title : id);

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
      const taskRaw = wk.days[d] || "";
      const exam = examByDate[iso];
      days.push({
        id: iso,
        date: iso,
        dow: dows[date.getDay()],
        dnum: date.getDate(),
        week: wk.week,
        topic: wk.topic,
        chapter: wk.chapter,
        task: exam ? `${exam.name} - ${exam.time}, ${exam.location}` : taskRaw,
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
  const mastered = Object.values(state.cards).filter((v) => v === "known").length;
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
    const pages = state.planPages[next.id];
    html += `
      <div class="card next-card" style="margin-bottom:18px">
        <div class="eyebrow">Study next</div>
        <h2>${fmtDate(next.id)} - Week ${next.week}</h2>
        <div class="reading">${esc(next.task)}</div>
        <div class="pages-line">Pages: ${
          pages ? esc(pages) : '<span class="muted">not set yet - open the day to add them</span>'
        }</div>
        <div class="row" style="margin-top:14px">
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
      const sub =
        d.type === "study"
          ? `<div class="sub">${esc(topicTitle(d.topic))}${todayBadge}</div>`
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
  const pages = state.planPages[id] || "";
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
        <button class="btn ${isDone ? "" : "good"}" data-done="${id}">${
      isDone ? "Mark not done" : "Mark done"
    }</button>
        <button class="btn" data-study-fc="${day.topic}">Study flashcards</button>
        <button class="btn" data-study-quiz="${day.topic}">Take quiz</button>
      </div>`;
  }
  row.after(panel);

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
  fcDeck = FLASHCARDS.filter((c) => fcTopic === "all" || c.topic === fcTopic);
  // study not-yet-known first
  fcDeck.sort((a, b) => (state.cards[a.id] === "known" ? 1 : 0) - (state.cards[b.id] === "known" ? 1 : 0));
  fcPos = 0;
  fcFlipped = false;
}

function renderFlashcards() {
  buildDeck();
  const app = $("#app");
  const opts = ['<option value="all">All topics</option>']
    .concat(TOPICS.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`))
    .join("");
  app.innerHTML = `
    <div class="view-head"><h1>Flashcards</h1><p>Tap a card to flip. Mark each one so the app knows what to drill.</p></div>
    <div class="row" style="margin-bottom:8px">
      <label class="field">Topic
        <select id="fcTopic">${opts}</select>
      </label>
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
    if (!confirm("Reset flashcard progress for all topics?")) return;
    state.cards = {};
    saveState();
    buildDeck();
    drawCard();
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
    const known = fcDeck.filter((c) => state.cards[c.id] === "known").length;
    area.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>Deck complete</h2>
        <p class="muted">${known} of ${fcDeck.length} marked as known.</p>
        <button class="btn primary" id="fcAgain">Go through again</button>
      </div>`;
    $("#fcAgain").addEventListener("click", () => {
      buildDeck();
      drawCard();
    });
    return;
  }
  const card = fcDeck[fcPos];
  const status = state.cards[card.id];
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
      <button class="btn" id="fcLearning">Still learning</button>
      <button class="btn good" id="fcKnown">Got it</button>
    </div>
    <div class="row" style="justify-content:center;margin-top:8px">
      <span class="muted">${status ? "Marked: " + (status === "known" ? "got it" : "still learning") : "Not marked yet"}</span>
    </div>`;
  $("#fcCard").addEventListener("click", () => {
    fcFlipped = !fcFlipped;
    $("#fcCard").classList.toggle("flipped", fcFlipped);
  });
  $("#fcLearning").addEventListener("click", () => mark(card, "learning"));
  $("#fcKnown").addEventListener("click", () => mark(card, "known"));
}

function mark(card, status) {
  state.cards[card.id] = status;
  saveState();
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
  const opts = ['<option value="all">Mixed (all topics)</option>']
    .concat(TOPICS.map((t) => `<option value="${t.id}">${esc(t.title)}</option>`))
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
  const pool = QUIZ.filter((q) => quizTopic === "all" || q.topic === quizTopic);
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
function renderNotes() {
  const app = $("#app");
  app.innerHTML = `
    <div class="view-head"><h1>Topic notes</h1><p>Quick summaries to review before problem sets and exams.</p></div>
    <div id="notesList"></div>`;
  $("#notesList").innerHTML = NOTES.map((n) => {
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
        <div style="padding:0 16px 16px">${sections}</div>
      </details>`;
  }).join("");
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

/* ---------- boot ---------- */
go("plan");
