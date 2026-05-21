/*
 * In-app textbook reader.
 *
 * Lets you read the actual Jones & Fleming pages inside the app. You load your
 * own PDF once; it's stored in this browser only (IndexedDB) and is NEVER
 * uploaded or committed anywhere. Each study day's "Read pp. X-Y" button opens
 * the book to those pages.
 *
 * Printed page numbers (from the table of contents) differ from the PDF's
 * physical page numbers by a fixed front-matter offset (40 for the standard
 * file). It's adjustable in the reader if your copy is shifted.
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
function bookOffset() {
  const c = loadBookCfg();
  return Number.isFinite(c.offset) ? c.offset : 40;
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

let bookDoc = null;
async function getBookDoc() {
  if (bookDoc) return bookDoc;
  const buf = await idbGet("pdf");
  if (!buf) return null;
  await ensurePdfJs();
  bookDoc = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  return bookDoc;
}
async function saveBookPdf(file) {
  const buf = await file.arrayBuffer();
  await idbPut("pdf", buf);
  bookDoc = null; // force reload
}
async function hasBook() {
  return !!(await idbGet("pdf"));
}

/* ---------- reader overlay ---------- */
let readerPrinted = 1;
let readerZoom = 1;

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
    <div class="reader-foot" id="readerTools"></div>`;
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
  if (lbl) lbl.textContent = "p. " + readerPrinted;
  const tools = document.getElementById("readerTools");
  if (tools)
    tools.innerHTML = `
      <span class="muted" style="font-size:.8rem">Page off? nudge:</span>
      <button class="btn small" id="readerOffMinus">-1</button>
      <button class="btn small" id="readerOffPlus">+1</button>
      <span class="spacer"></span>
      <button class="btn small ghost" id="readerReplace">Replace PDF</button>`;
  const minus = document.getElementById("readerOffMinus");
  if (minus)
    minus.addEventListener("click", () => {
      saveBookCfg({ offset: bookOffset() - 1 });
      renderReaderPage();
    });
  const plus = document.getElementById("readerOffPlus");
  if (plus)
    plus.addEventListener("click", () => {
      saveBookCfg({ offset: bookOffset() + 1 });
      renderReaderPage();
    });
  const repl = document.getElementById("readerReplace");
  if (repl) repl.addEventListener("click", showReaderLoad);
}

function showReaderLoad() {
  const body = document.getElementById("readerBody");
  if (!body) return;
  body.innerHTML = `
    <div class="reader-load">
      <h3>Add your textbook</h3>
      <p class="muted">Pick your Jones &amp; Fleming PDF. It's saved on this device only (in your browser) and is never uploaded.</p>
      <input type="file" id="readerFile" accept="application/pdf,.pdf" />
      <p class="muted" id="readerLoadMsg" style="margin-top:10px"></p>
    </div>`;
  $("#readerFile", body).addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const msg = $("#readerLoadMsg", body);
    msg.textContent = "Saving...";
    try {
      await saveBookPdf(f);
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
    doc = await getBookDoc();
  } catch (e) {
    body.innerHTML = `<div class="empty">Could not open the PDF: ${esc(e.message)}</div>`;
    return;
  }
  if (!doc) {
    showReaderLoad();
    return;
  }
  const pdfPage = readerPrinted + bookOffset();
  if (pdfPage < 1 || pdfPage > doc.numPages) {
    body.innerHTML = `<div class="empty">Page ${readerPrinted} is outside this PDF. Use the nudge buttons to fix the offset.</div>`;
    updateReaderLabel();
    return;
  }
  const page = await doc.getPage(pdfPage);
  const vp1 = page.getViewport({ scale: 1 });
  // CSS width to display the page at, then render at device pixel density so
  // text is crisp on high-DPI phone screens. Zoom widens it (and scrolls).
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

async function openReader(printedStart) {
  const el = ensureReaderEl();
  readerPrinted = printedStart || 1;
  el.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  document.getElementById("readerBody").innerHTML =
    '<div class="empty">Loading...</div>';
  updateReaderLabel();
  const doc = await getBookDoc().catch(() => null);
  if (!doc) {
    showReaderLoad();
    return;
  }
  renderReaderPage();
}

function closeReader() {
  const el = document.getElementById("reader");
  if (el) el.classList.add("hidden");
  document.body.style.overflow = "";
}
