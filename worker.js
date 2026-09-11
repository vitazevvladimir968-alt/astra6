const MODEL_REQUIRED = "OPENAI_MODEL";
const IMAGE_MODEL = "gpt-image-2";
const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 20;
const buckets = new Map();

function cors(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
function json(data, status, request) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors(request) } });
}
function allowed(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const old = buckets.get(ip);
  if (!old || now - old.started > WINDOW_MS) { buckets.set(ip, { started: now, count: 1 }); return true; }
  old.count++;
  return old.count <= MAX_REQUESTS;
}
function systemMessage() {
  return "Ты — Джарвис, ИИ-помощник приложения Astra 6. Отвечай на русском по умолчанию. Будь точным, дружелюбным и полезным. Не выдумывай факты. Если пользователь просит актуальную информацию и доступен веб-поиск — используй его.";
}
async function openai(env, path, body) {
  if (!env.OPENAI_API_KEY) throw new Error("На сервере не задан OPENAI_API_KEY");
  const r = await fetch(`https://api.openai.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message || `OpenAI API ${r.status}`);
  return data;
}
function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const out = data?.output || [];
  return out.flatMap(x => x?.content || []).map(x => x?.text || "").join("");
}
function makeInput(messages) {
  return messages.map(m => {
    if (m.role === "system") return { role: "developer", content: [{ type: "input_text", text: String(m.content || "") }] };
    return { role: m.role === "assistant" ? "assistant" : "user", content: [{ type: "input_text", text: String(m.content || "") }] };
  });
}
function addFileMessage(messages, file) {
  if (!file?.data || !file?.type) return messages;
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return messages;
  if (file.type.startsWith("image/")) last.content = [{ type: "input_text", text: String(last.content || "") }, { type: "input_image", image_url: file.data }];
  else if (file.type === "application/pdf") last.content = [{ type: "input_text", text: String(last.content || "") }, { type: "input_file", file_data: file.data, filename: file.name || "document.pdf" }];
  return messages;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(request) });
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response("Astra 6 API is online.", { headers: cors(request) });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, request);
    if (!allowed(request)) return json({ error: "Слишком много запросов. Попробуйте позже." }, 429, request);
    try {
      const body = await request.json();
      if (url.pathname === "/api/chat") {
        const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : [];
        if (!messages.length) return json({ error: "Нет сообщения" }, 400, request);
        addFileMessage(messages, body.file);
        const payload = { model: env[MODEL_REQUIRED], input: makeInput(messages), max_output_tokens: 2500 };
        if (!payload.model) return json({ error: "На сервере не задана модель OPENAI_MODEL" }, 500, request);
        if (body.webSearch) payload.tools = [{ type: "web_search_preview" }];
        const data = await openai(env, "responses", payload);
        return json({ text: extractResponseText(data) }, 200, request);
      }
      if (url.pathname === "/api/image") {
        const prompt = String(body.prompt || "").trim();
        if (!prompt) return json({ error: "Нет описания изображения" }, 400, request);
        const data = await openai(env, "images/generations", { model: env.OPENAI_IMAGE_MODEL || IMAGE_MODEL, prompt, size: "1024x1024", quality: "low" });
        const item = data?.data?.[0];
        return json({ url: item?.url || null, b64: item?.b64_json || null }, 200, request);
      }
      return json({ error: "Not found" }, 404, request);
    } catch (e) {
      return json({ error: e?.message || "Ошибка сервера Astra 6" }, 500, request);
    }
  }
};
