/*
 * AI features for the CHEM 121 Orgo Study Hub.
 *
 * Calls the Anthropic Messages API DIRECTLY from the browser with a key the
 * user pastes in. That key is stored only in this browser's localStorage and
 * is sent straight to api.anthropic.com - so only use this on your own device,
 * and set a spend limit on the key.
 *
 * Structured output is produced with tool use (forced tool_choice) so we always
 * get clean JSON. The source document is sent with cache_control so studying
 * the same text three ways (summary / flashcards / quiz) reuses the cache.
 */

const AI_CFG_KEY = "chem121_ai_v1";
const AI_ENDPOINT = "https://api.anthropic.com/v1/messages";

const AI_MODELS = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7 - most capable" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 - balanced" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 - fastest & cheapest" },
];

const AI_SYSTEM =
  "You are a precise organic chemistry study assistant for a Stanford CHEM 121 student using the Jones & Fleming textbook. Base everything strictly on the provided source material. Be accurate and never invent facts the material does not support.";

const AI_TOOLS = [
  {
    name: "save_flashcards",
    description: "Save a set of study flashcards generated from the source material.",
    input_schema: {
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
  {
    name: "save_quiz",
    description: "Save multiple-choice quiz questions generated from the source material.",
    input_schema: {
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
  {
    name: "save_summary",
    description: "Save a concise study summary with key points.",
    input_schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "A concise prose summary." },
        key_points: { type: "array", items: { type: "string" }, description: "5-8 key bullet points." },
      },
      required: ["summary", "key_points"],
    },
  },
];

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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read the file."));
    r.readAsDataURL(file);
  });
}

function aiSourceBlock(source) {
  const block =
    source.type === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: source.data } }
      : { type: "text", text: source.text };
  block.cache_control = { type: "ephemeral" };
  return block;
}

async function aiCall({ toolName, taskText, source, maxTokens }) {
  const cfg = loadAICfg();
  if (!cfg.apiKey) throw new Error("Add your Anthropic API key first (in AI Tools settings).");

  const body = {
    model: cfg.model || "claude-opus-4-7",
    max_tokens: maxTokens || 8000,
    system: AI_SYSTEM,
    tools: AI_TOOLS,
    tool_choice: { type: "tool", name: toolName },
    messages: [
      { role: "user", content: [aiSourceBlock(source), { type: "text", text: taskText }] },
    ],
  };

  let res;
  try {
    res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Network error reaching the API. Check your connection.");
  }

  if (!res.ok) {
    let msg = "API error " + res.status;
    try {
      const err = await res.json();
      if (err && err.error && err.error.message) msg = err.error.message;
    } catch (e) {}
    if (res.status === 401) msg = "Invalid API key. Double-check it in settings.";
    throw new Error(msg);
  }

  const data = await res.json();
  const tu = (data.content || []).find((b) => b.type === "tool_use" && b.name === toolName);
  if (!tu || !tu.input) throw new Error("The model did not return structured data. Try again.");
  return tu.input;
}

async function aiFlashcards(source, count) {
  const out = await aiCall({
    toolName: "save_flashcards",
    taskText: `Using ONLY the source material above, create ${count} high-quality study flashcards covering its most important concepts, definitions, reactions, and mechanisms. Keep the front concise and the back accurate and complete. Then call save_flashcards.`,
    source,
    maxTokens: 8000,
  });
  return out.cards || [];
}

async function aiQuiz(source, count) {
  const out = await aiCall({
    toolName: "save_quiz",
    taskText: `Using ONLY the source material above, write ${count} multiple-choice questions, each with exactly four options and one correct answer, plus a brief explanation. Vary the difficulty. Then call save_quiz.`,
    source,
    maxTokens: 8000,
  });
  return out.questions || [];
}

async function aiSummary(source) {
  return aiCall({
    toolName: "save_summary",
    taskText: `Summarize the source material above into a concise study summary, then give 5-8 key bullet points a student should remember. Then call save_summary.`,
    source,
    maxTokens: 2000,
  });
}
