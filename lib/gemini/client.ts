/**
 * Gemini AI Client — Key rotation, model fallback, retry, rate-limit handling
 */

import { GoogleAuth } from "google-auth-library";
import fs from "fs";
import path from "path";

const GEMINI_API_KEYS: string[] = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
].filter((k): k is string => Boolean(k));

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Primary model — use env override if set, else default to flash.
 * Set GEMINI_MODEL in .env.local to switch globally, e.g. "gemini-1.5-flash"
 */
export const GEMINI_MODEL: string =
  process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

/**
 * Fallback model chain — tried in order when rate-limited on a model.
 * Each key×model combination is a separate quota bucket.
 */
const MODEL_FALLBACK_CHAIN: string[] = [
  GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
].filter((m, i, arr) => arr.indexOf(m) === i); // dedup

// Global key index for rotation
let currentKeyIndex = 0;

function getNextKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error("No Gemini API keys configured (GEMINI_API_KEY)");
  }
  const key = GEMINI_API_KEYS[currentKeyIndex % GEMINI_API_KEYS.length];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  return key;
}

export interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string; // base64
  };
}

export interface GeminiRequest {
  contents: Array<{
    role?: string;
    parts: GeminiPart[];
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
    finishReason?: string;
  }>;
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class ModelNotFoundError extends Error {
  constructor(model: string) {
    super(`Model not found (404): ${model}`);
    this.name = "ModelNotFoundError";
  }
}

export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

async function callGeminiWithKey(
  key: string,
  model: string,
  request: GeminiRequest,
  signal?: AbortSignal
): Promise<string> {
  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (errorBody.includes("prepayment credits are depleted")) {
      throw new GeminiError(`[Prepayment Depleted] Google AI Studio key chưa nạp tiền Prepayment hoặc cần chuyển sang Pay-as-you-go tại https://ai.studio/projects`);
    }
    if (response.status === 429 || response.status === 503) {
      throw new RateLimitError(`Rate limited (${response.status}): ${errorBody}`);
    }
    if (response.status === 400) {
      throw new GeminiError(`Bad request (400): ${errorBody}`);
    }
    if (response.status === 404) {
      throw new ModelNotFoundError(model);
    }
    throw new GeminiError(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Empty response from Gemini");
  }
  return text;
}

// ── Google Cloud Vertex AI Adapter (Billed to GCP Credits) ──────
let cachedVertexToken: string | null = null;
let vertexTokenExpiry = 0;

async function getVertexAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedVertexToken && now < vertexTokenExpiry - 60000) {
    return cachedVertexToken;
  }

  const keyFilePath = process.env.GCP_KEY_FILE
    ? path.resolve(process.cwd(), process.env.GCP_KEY_FILE)
    : path.resolve(process.cwd(), "gcp-service-account.json");

  const hasKeyFile = fs.existsSync(keyFilePath);
  const hasEnvKey = Boolean(process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL);

  if (!hasKeyFile && !hasEnvKey) {
    return null;
  }

  try {
    const auth = new GoogleAuth({
      keyFile: hasKeyFile ? keyFilePath : undefined,
      credentials: hasEnvKey
        ? {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
          }
        : undefined,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const res = await client.getAccessToken();
    if (res.token) {
      cachedVertexToken = res.token;
      vertexTokenExpiry = Date.now() + 3500 * 1000;
      return cachedVertexToken;
    }
  } catch (err) {
    console.error("[gemini] Error getting Vertex AI access token:", err);
  }
  return null;
}

export async function callVertexAI(
  request: GeminiRequest,
  signal?: AbortSignal
): Promise<string> {
  const token = await getVertexAccessToken();
  if (!token) {
    throw new Error("Vertex AI credentials not found or token creation failed");
  }

  const project = process.env.GCP_PROJECT_ID || "active-mountain-502906-u2";
  const location = process.env.GCP_LOCATION || "us-central1";
  const model = process.env.VERTEX_MODEL || "gemini-2.5-flash";

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${model}:generateContent`;

  // Format request contents if inline_data is present for Vertex schema
  const vertexContents = request.contents.map((c) => ({
    role: c.role || "user",
    parts: c.parts.map((p) => {
      if (p.inline_data) {
        return {
          inlineData: {
            mimeType: p.inline_data.mime_type,
            data: p.inline_data.data,
          },
        };
      }
      return p;
    }),
  }));

  const payload: Record<string, unknown> = {
    contents: vertexContents,
  };

  if (request.systemInstruction) {
    payload.systemInstruction = request.systemInstruction;
  }
  if (request.generationConfig) {
    payload.generationConfig = request.generationConfig;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new GeminiError(`Vertex AI error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new GeminiError("Empty response from Vertex AI");
  }
  return text;
}

/**
 * Main Gemini call:
 * 1. Ưu tiên 1: Thử Google Cloud Vertex AI (tính phí trực tiếp vào 300$ Google Cloud credits).
 * 2. Ưu tiên 2: Fallback qua danh sách Gemini API Keys nếu Vertex AI gặp sự cố.
 */
export async function callGemini(
  request: GeminiRequest,
  model: string = GEMINI_MODEL,
  timeoutMs: number = 60000
): Promise<string> {
  // ── Priority 1: Google Cloud Vertex AI ────────────────────────
  const keyFilePath = process.env.GCP_KEY_FILE
    ? path.resolve(process.cwd(), process.env.GCP_KEY_FILE)
    : path.resolve(process.cwd(), "gcp-service-account.json");
  const hasVertex = fs.existsSync(keyFilePath) || (process.env.GCP_PROJECT_ID && process.env.GCP_PRIVATE_KEY);

  if (hasVertex) {
    const vertexModel = process.env.VERTEX_MODEL || "gemini-2.5-flash";
    console.log(`[gemini] Trying Google Cloud Vertex AI (${vertexModel}) ...`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await callVertexAI(request, controller.signal);
      clearTimeout(timeout);
      console.log(`[gemini] ✓ Vertex AI call successful (${vertexModel})`);
      return result;
    } catch (vErr: any) {
      clearTimeout(timeout);
      console.warn(`[gemini] Vertex AI failed: ${vErr.message} → attempting API key fallback`);
    }
  }

  // ── Priority 2: Gemini Developer API Key rotation fallback ────
  if (GEMINI_API_KEYS.length === 0) {
    throw new GeminiError("No Gemini API keys configured (GEMINI_API_KEY)");
  }

  // Build model chain starting from the requested model
  const modelChain: string[] = MODEL_FALLBACK_CHAIN.includes(model)
    ? MODEL_FALLBACK_CHAIN
    : [model, ...MODEL_FALLBACK_CHAIN];

  const keys = [...GEMINI_API_KEYS]; // snapshot
  let lastError: Error = new Error("No attempts made");

  for (const currentModel of modelChain) {
    let allRateLimited = true; // assume all keys are rate-limited until proven otherwise

    for (let ki = 0; ki < keys.length; ki++) {
      const key = keys[ki];
      const keyLabel = `key${ki + 1}/${keys.length}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[gemini] Trying ${currentModel} | ${keyLabel}`);

      try {
        const result = await callGeminiWithKey(key, currentModel, request, controller.signal);
        clearTimeout(timeout);
        if (currentModel !== model) {
          console.info(`[gemini] ✓ Success — model: ${currentModel}, ${keyLabel}`);
        }
        return result;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err instanceof Error ? err : new Error(String(err));

        if (err instanceof ModelNotFoundError) {
          console.warn(`[gemini] Model "${currentModel}" not found (404) → skipping immediately to next model in chain`);
          allRateLimited = false;
          break; // Model này không tồn tại trên Google API, nhảy ngay sang model tiếp theo
        } else if (err instanceof RateLimitError) {
          // Key này bị rate-limit hoặc hết quota → thử key tiếp theo
          console.warn(`[gemini] ✗ Rate limited — ${currentModel} | ${keyLabel}`);
          await new Promise((r) => setTimeout(r, 300)); // short pause between keys
        } else if (err instanceof GeminiError) {
          // Lỗi không phải rate-limit (bad prompt, content policy…) → dừng ngay
          allRateLimited = false;
          console.error(`[gemini] ✗ Fatal error on ${currentModel} | ${keyLabel}: ${err.message}`);
          throw err;
        } else {
          // Network / timeout → ghi nhận nhưng vẫn tiếp tục key tiếp
          allRateLimited = false;
          console.warn(`[gemini] ✗ Network error on ${currentModel} | ${keyLabel}: ${lastError.message}`);
        }
      }
    }

    // Đã thử hết tất cả key cho model này
    if (allRateLimited) {
      console.warn(`[gemini] All ${keys.length} key(s) rate-limited on "${currentModel}" → fallback to next model`);
    }
  }

  // Hết toàn bộ model chain
  throw lastError;
}


/**
 * Parse JSON from Gemini response (handles markdown code fences + truncated JSON)
 */
export function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // 1. Try parse as-is
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // continue to recovery
  }

  // 2. Try extracting outermost JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch {
      // continue to recovery
    }
  }

  // 3. Partial JSON recovery — auto-close truncated JSON
  const partial = jsonMatch?.[0] ?? cleaned;
  const recovered = tryRepairJson(partial);
  if (recovered !== null) {
    try {
      return JSON.parse(recovered) as T;
    } catch {
      // fall through to error
    }
  }

  throw new Error(`Failed to parse Gemini JSON response: ${raw.slice(0, 200)}`);
}

/**
 * Attempt to repair a truncated JSON string by counting open/close chars
 * and appending the missing closing tokens.
 */
function tryRepairJson(s: string): string | null {
  try {
    // Remove trailing incomplete key/value (e.g. "foo": <incomplete>)
    // Find last complete comma-separated entry
    let truncated = s.trimEnd();

    // Remove trailing comma or incomplete key
    truncated = truncated.replace(/,\s*$/, "").replace(/,\s*"[^"]*"?\s*:\s*[^,}\]]*$/, "");

    // Count nesting
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (const ch of truncated) {
      if (escape) { escape = false; continue; }
      if (ch === "\\" && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }

    // Close all open blocks
    const closing = stack.reverse().join("");
    return truncated + closing;
  } catch {
    return null;
  }
}
