/*
 * In-app PDF reader for TWO documents:
 *   - 'book'  : the Jones & Fleming textbook (read assigned pages / problems)
 *   - 'guide' : the Study Guide / Solutions Manual (see answers)
 *
 * You load each PDF once; they're stored in this browser only (IndexedDB) and
 * are NEVER uploaded. The textbook's printed page numbers differ from the PDF's
 * physical pages by a fixed offset (default 40); the guide is navigated by its
 * own page numbers and you can "pin" each chapter's solutions page so it jumps
 * straight there next time.
 */

const BOOK_CFG_KEY = "chem121_book_v1";
function loadBookCfg() {
  try {
    return JSON.parse(localStorage.getItem(BOOK_CFG_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveBookCfg(c) {
  localStorage.setItem(BOOK_CFG_KEY, JSON.stringify(c));
}
function docOffset(which) {
  const c = loadBookCfg();
  if (which === "guide") return Number.isFinite(c.guideOffset) ? c.guideOffset : 0;
  return Number.isFinite(c.offset) ? c.offset : 40;
}
function setDocOffset(which, val) {
  const c = loadBookCfg();
  if (which === "guide") c.guideOffset = val;
  else c.offset = val;
  saveBookCfg(c);
}

/* ---------- IndexedDB (stores the PDF bytes on-device) ---------- */
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("chem121_book", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function idbPut(key, val) {
  return idbOpen().then(
    (db) =>
      new Promise((res, rej) => {
        const tx = db.transaction("files", "readwrite");
        tx.objectStore("files").put(val, key);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      })
  );
}
function idbGet(key) {
  return idbOpen().then(
    (db) =>
      new Promise((res, rej) => {
        const tx = db.transaction("files", "readonly");
        const rq = tx.objectStore("files").get(key);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      })
  );
}

const docKey = (which) => (which === "guide" ? "guide" : "pdf");
const docDocs = { book: null, guide: null };
async function getDoc(which) {
  if (docDocs[which]) return docDocs[which];
  const buf = await idbGet(docKey(which));
  if (!buf) return null;
  await ensurePdfJs();
  docDocs[which] = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  return docDocs[which];
}
async function saveDocPdf(which, file) {
  const buf = await file.arrayBuffer();
  await idbPut(docKey(which), buf);
  docDocs[which] = null; // force reload
}

/* ---------- reader overlay ---------- */
let readerWhich = "book";
let readerPrinted = 1;
let readerZoom = 1;
let readerChapter = null; // set when opened for a chapter's solutions

function ensureReaderEl() {
  let el = document.getElementById("reader");
  if (el) return el;
  el = document.createElement("div");
  el.id = "reader";
  el.className = "reader hidden";
  el.innerHTML = `
    <div class="reader-bar">
      <strong id="readerTitle">Textbook</strong>
      <span class="spacer"></span>
      <button class="btn small" id="readerZoomOut">A-</button>
      <button class="btn small" id="readerZoomIn">A+</button>
      <button class="btn small ghost" id="readerClose">Close</button>
    </div>
    <div class="reader-body" id="readerBody"></div>
    <div class="reader-foot">
      <button class="btn" id="readerPrev">&larr; Prev</button>
      <span class="reader-page" id="readerLabel"></span>
      <button class="btn" id="readerNext">Next &rarr;</button>
    </div>
    <div class="reader-foot reader-tools" id="readerTools"></div>`;
  document.body.appendChild(el);
  $("#readerClose", el).addEventListener("click", closeReader);
  $("#readerZoomIn", el).addEventListener("click", () => {
    readerZoom = Math.min(2.5, readerZoom + 0.25);
    renderReaderPage();
  });
  $("#readerZoomOut", el).addEventListener("click", () => {
    readerZoom = Math.max(0.6, readerZoom - 0.25);
    renderReaderPage();
  });
  $("#readerPrev", el).addEventListener("click", () => {
    readerPrinted = Math.max(1, readerPrinted - 1);
    renderReaderPage();
  });
  $("#readerNext", el).addEventListener("click", () => {
    readerPrinted += 1;
    renderReaderPage();
  });
  return el;
}

function updateReaderLabel() {
  const lbl = document.getElementById("readerLabel");
  if (lbl) lbl.textContent = (readerWhich === "guide" ? "page " : "p. ") + readerPrinted;
  const title = document.getElementById("readerTitle");
  if (title) title.textContent = readerWhich === "guide" ? "Solutions guide" : "Textbook";
  const tools = document.getElementById("readerTools");
  if (!tools) return;
  const pinBtn =
    readerWhich === "guide" && readerChapter
      ? `<button class="btn small good" id="readerPin">Pin Ch ${esc(readerChapter)} here</button>`
      : "";
  tools.innerHTML = `
    <input type="text" id="readerJump" value="${readerPrinted}" inputmode="numeric" style="width:64px" />
    <button class="btn small" id="readerGo">Go</button>
    <span class="muted" style="font-size:.78rem">off?</span>
    <button class="btn small" id="readerOffMinus">-1</button>
    <button class="btn small" id="readerOffPlus">+1</button>
    ${pinBtn}
    <span class="spacer"></span>
    <button class="btn small ghost" id="readerReplace">Replace PDF</button>`;
  $("#readerGo", tools).addEventListener("click", () => {
    const v = parseInt($("#readerJump", tools).value, 10);
    if (Number.isFinite(v)) {
      readerPrinted = Math.max(1, v);
      renderReaderPage();
    }
  });
  $("#readerOffMinus", tools).addEventListener("click", () => {
    setDocOffset(readerWhich, docOffset(readerWhich) - 1);
    renderReaderPage();
  });
  $("#readerOffPlus", tools).addEventListener("click", () => {
    setDocOffset(readerWhich, docOffset(readerWhich) + 1);
    renderReaderPage();
  });
  $("#readerReplace", tools).addEventListener("click", () => showReaderLoad(readerWhich));
  const pin = $("#readerPin", tools);
  if (pin)
    pin.addEventListener("click", () => {
      const c = loadBookCfg();
      c.guidePages = c.guidePages || {};
      c.guidePages[readerChapter] = readerPrinted;
      saveBookCfg(c);
      pin.textContent = "Pinned!";
    });
}

function showReaderLoad(which) {
  readerWhich = which;
  const body = document.getElementById("readerBody");
  if (!body) return;
  const label = which === "guide" ? "solutions guide" : "textbook";
  body.innerHTML = `
    <div class="reader-load">
      <h3>Add your ${label}</h3>
      <p class="muted">Pick the ${label} PDF. It's saved on this device only (in your browser) and is never uploaded.</p>
      <input type="file" id="readerFile" accept="application/pdf,.pdf" />
      <p class="muted" id="readerLoadMsg" style="margin-top:10px"></p>
    </div>`;
  updateReaderLabel();
  $("#readerFile", body).addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const msg = $("#readerLoadMsg", body);
    msg.textContent = "Saving...";
    try {
      await saveDocPdf(which, f);
      msg.textContent = "Saved. Opening...";
      await renderReaderPage();
    } catch (err) {
      msg.textContent = "Could not save: " + err.message;
    }
  });
}

async function renderReaderPage() {
  const body = document.getElementById("readerBody");
  if (!body) return;
  let doc;
  try {
    doc = await getDoc(readerWhich);
  } catch (e) {
    body.innerHTML = `<div class="empty">Could not open the PDF: ${esc(e.message)}</div>`;
    return;
  }
  if (!doc) {
    showReaderLoad(readerWhich);
    return;
  }
  if (readerWhich === "guide") {
    const c = loadBookCfg();
    c.lastGuidePage = readerPrinted;
    saveBookCfg(c);
  }
  const pdfPage = readerPrinted + docOffset(readerWhich);
  if (pdfPage < 1 || pdfPage > doc.numPages) {
    body.innerHTML = `<div class="empty">Page ${readerPrinted} is outside this PDF. Use Go or the nudge buttons.</div>`;
    updateReaderLabel();
    return;
  }
  const page = await doc.getPage(pdfPage);
  const vp1 = page.getViewport({ scale: 1 });
  const avail = (body.clientWidth || window.innerWidth || 800) - 24;
  const cssW = Math.max(280, avail * readerZoom);
  const scale = cssW / vp1.width;
  const vp = page.getViewport({ scale });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let canvas = document.getElementById("readerCanvas");
  if (!canvas) {
    body.innerHTML = '<canvas id="readerCanvas"></canvas>';
    canvas = document.getElementById("readerCanvas");
  }
  canvas.width = Math.floor(vp.width * dpr);
  canvas.height = Math.floor(vp.height * dpr);
  canvas.style.width = Math.floor(vp.width) + "px";
  canvas.style.height = Math.floor(vp.height) + "px";
  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport: vp,
    transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
  }).promise;
  updateReaderLabel();
}

async function openReader(printedStart, which, chapter) {
  const el = ensureReaderEl();
  readerWhich = which || "book";
  readerChapter = chapter || null;
  readerPrinted = printedStart || 1;
  el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("readerBody").innerHTML = '<div class="empty">Loading...</div>';
  updateReaderLabel();
  const doc = await getDoc(readerWhich).catch(() => null);
  if (!doc) {
    showReaderLoad(readerWhich);
    return;
  }
  renderReaderPage();
}

/* Open the solutions guide for a chapter, jumping to its pinned page if set. */
function openGuideForChapter(ch) {
  const c = loadBookCfg();
  const pinned = (c.guidePages || {})[ch];
  const page = pinned || c.lastGuidePage || 1;
  openReader(page, "guide", ch);
}

function closeReader() {
  const el = document.getElementById("reader");
  if (el) el.classList.add("hidden");
  document.body.style.overflow = "";
}
