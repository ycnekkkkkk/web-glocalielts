/**
 * Gemini AI Client — Key rotation, model fallback, retry, rate-limit handling
 */

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
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/**
 * Fallback model chain — tried in order when rate-limited on a model.
 * Each key×model combination is a separate quota bucket.
 */
const MODEL_FALLBACK_CHAIN: string[] = [
  GEMINI_MODEL,
  // "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  // "gemini-1.5-flash-8b",
  // "gemini-1.5-flash-latest",
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
    if (response.status === 429 || response.status === 503) {
      throw new RateLimitError(`Rate limited (${response.status}): ${errorBody}`);
    }
    if (response.status === 400) {
      throw new GeminiError(`Bad request (400): ${errorBody}`);
    }
    if (response.status === 404) {
      throw new RateLimitError(`Model not found (404): ${model}`);
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

/**
 * Main Gemini call:
 * 1. Thử từng KEY cho model hiện tại: key1 → key2 → key3 → ...
 * 2. Nếu TẤT CẢ key đều rate-limited → chuyển sang model fallback tiếp theo
 * 3. Lặp lại cho đến khi thành công hoặc hết chain
 */
export async function callGemini(
  request: GeminiRequest,
  model: string = GEMINI_MODEL,
  timeoutMs: number = 55000
): Promise<string> {
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

        if (err instanceof RateLimitError) {
          // Key này bị rate-limit → thử key tiếp theo
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
