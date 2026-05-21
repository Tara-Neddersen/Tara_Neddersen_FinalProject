/*
 * AI features for the CHEM 121 Orgo Study Hub.
 *
 * Supports two providers, picked in the AI Tools settings:
 *   - xAI (Grok)      -> https://api.x.ai/v1/chat/completions  (OpenAI-style)
 *   - Anthropic (Claude) -> https://api.anthropic.com/v1/messages
 *
 * The API key is stored ONLY in this browser's localStorage and sent straight
 * to the provider. Use it on your own device and set a spend limit on the key.
 *
 * Structured output is produced with function/tool calling (forced) so we get
 * clean JSON. PDFs are turned into text in the browser (pdf.js) so uploads work
 * the same for either provider.
 */

const AI_CFG_KEY = "chem121_ai_v1";

const AI_PROVIDERS = {
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    endpoint: "https://api.x.ai/v1/chat/completions",
    keyHint: "xai-...",
    models: ["grok-4", "grok-3", "grok-3-mini"],
    defaultModel: "grok-4",
    note: "Enter a model your plan allows (see console.x.ai). grok-3-mini is the cheapest.",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    endpoint: "https://api.anthropic.com/v1/messages",
    keyHint: "sk-ant-...",
    models: ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5"],
    defaultModel: "claude-opus-4-7",
    note: "Get a key at console.anthropic.com. Haiku is cheapest, Opus most capable.",
  },
};

const AI_SYSTEM =
  "You are a precise organic chemistry study assistant for a Stanford CHEM 121 student using the Jones & Fleming textbook. Base everything strictly on the provided source material. Be accurate and never invent facts the material does not support.";

// Tool/function schemas, shared across providers.
const TOOL_DEFS = {
  save_flashcards: {
    description: "Save a set of study flashcards generated from the source material.",
    schema: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          description: "The flashcards.",
          items: {
            type: "object",
            properties: {
              front: { type: "string", description: "The question or prompt side." },
              back: { type: "string", description: "The answer side." },
            },
            required: ["front", "back"],
          },
        },
      },
      required: ["cards"],
    },
  },
  save_quiz: {
    description: "Save multiple-choice quiz questions generated from the source material.",
    schema: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              question: { type: "string" },
              options: { type: "array", items: { type: "string" }, description: "Exactly four answer choices." },
              answer_index: { type: "integer", description: "0-based index of the correct option." },
              explanation: { type: "string", description: "Why the correct answer is right." },
            },
            required: ["question", "options", "answer_index", "explanation"],
          },
        },
      },
      required: ["questions"],
    },
  },
  save_summary: {
    description: "Save a concise study summary with key points.",
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "A concise prose summary." },
        key_points: { type: "array", items: { type: "string" }, description: "5-8 key bullet points." },
      },
      required: ["summary", "key_points"],
    },
  },
};

function loadAICfg() {
  try {
    return JSON.parse(localStorage.getItem(AI_CFG_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveAICfg(cfg) {
  localStorage.setItem(AI_CFG_KEY, JSON.stringify(cfg));
}

/* ---------- PDF -> text (lazy-loads pdf.js from a CDN) ---------- */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Could not load the PDF reader (need internet for this)."));
    document.head.appendChild(s);
  });
}
async function ensurePdfJs() {
  if (window.pdfjsLib) return;
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}
async function extractPdfText(file) {
  await ensurePdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  let out = "";
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map((i) => i.str).join(" ") + "\n\n";
  }
  out = out.trim();
  if (out.length < 40)
    throw new Error("Couldn't read text from this PDF (it may be scanned images). Paste the text instead.");
  return out;
}

/* ---------- JSON helpers ---------- */
function parseLooseJSON(raw) {
  if (raw == null) throw new Error("No structured data returned. Try again.");
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Could not parse the response. Try again.");
  }
}

async function postJSON(url, headers, body) {
  let res;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch (e) {
    throw new Error("Network/CORS error reaching the provider. Browser-only calls may be blocked for this key.");
  }
  if (!res.ok) {
    let msg = "API error " + res.status;
    try {
      const err = await res.json();
      if (err && err.error) msg = err.error.message || err.error || msg;
    } catch (e) {}
    if (res.status === 401) msg = "Invalid API key. Check it in AI Tools settings.";
    throw new Error(msg);
  }
  return res.json();
}

/* ---------- provider calls ---------- */
async function anthropicCall({ apiKey, model, toolName, taskText, sourceText, maxTokens }) {
  const tools = Object.keys(TOOL_DEFS).map((name) => ({
    name,
    description: TOOL_DEFS[name].description,
    input_schema: TOOL_DEFS[name].schema,
  }));
  const body = {
    model,
    max_tokens: maxTokens || 8000,
    system: AI_SYSTEM,
    tools,
    tool_choice: { type: "tool", name: toolName },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: sourceText, cache_control: { type: "ephemeral" } },
          { type: "text", text: taskText },
        ],
      },
    ],
  };
  const data = await postJSON(AI_PROVIDERS.anthropic.endpoint, {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  }, body);
  const tu = (data.content || []).find((b) => b.type === "tool_use" && b.name === toolName);
  if (!tu || !tu.input) throw new Error("The model did not return structured data. Try again.");
  return tu.input;
}

async function xaiCall({ apiKey, model, toolName, taskText, sourceText, maxTokens }) {
  const body = {
    model,
    max_tokens: maxTokens || 8000,
    messages: [
      { role: "system", content: AI_SYSTEM },
      { role: "user", content: sourceText + "\n\n----\n" + taskText },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: toolName,
          description: TOOL_DEFS[toolName].description,
          parameters: TOOL_DEFS[toolName].schema,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: toolName } },
  };
  const data = await postJSON(AI_PROVIDERS.xai.endpoint, {
    "content-type": "application/json",
    authorization: "Bearer " + apiKey,
  }, body);
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  let raw = msg && msg.tool_calls && msg.tool_calls[0] && msg.tool_calls[0].function.arguments;
  if (raw == null && msg) raw = msg.content;
  return parseLooseJSON(raw);
}

async function aiCall(opts) {
  const cfg = loadAICfg();
  if (!cfg.apiKey) throw new Error("Add an API key first (in AI Tools settings).");
  const prov = AI_PROVIDERS[cfg.provider] || AI_PROVIDERS.xai;
  const model = cfg.model || prov.defaultModel;
  const args = Object.assign({ apiKey: cfg.apiKey, model }, opts);
  return prov.id === "anthropic" ? anthropicCall(args) : xaiCall(args);
}

/* ---------- high-level helpers used by the UI ---------- */
async function aiFlashcards(sourceText, count) {
  const out = await aiCall({
    toolName: "save_flashcards",
    taskText: `Using ONLY the source material above, create ${count} high-quality study flashcards covering its most important concepts, definitions, reactions, and mechanisms. Keep the front concise and the back accurate and complete. Return them via the save_flashcards tool.`,
    sourceText,
    maxTokens: 8000,
  });
  return out.cards || [];
}
async function aiQuiz(sourceText, count) {
  const out = await aiCall({
    toolName: "save_quiz",
    taskText: `Using ONLY the source material above, write ${count} multiple-choice questions, each with exactly four options and one correct answer, plus a brief explanation. Vary the difficulty. Return them via the save_quiz tool.`,
    sourceText,
    maxTokens: 8000,
  });
  return out.questions || [];
}
async function aiSummary(sourceText) {
  return aiCall({
    toolName: "save_summary",
    taskText: `Summarize the source material above into a concise study summary, then give 5-8 key bullet points a student should remember. Return them via the save_summary tool.`,
    sourceText,
    maxTokens: 2000,
  });
}
