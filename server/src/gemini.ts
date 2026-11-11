// Thin wrapper around the Gemini REST API. The key only ever lives on the server.
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const geminiConfigured = () => Boolean(process.env.AI_API_KEY);

// The first model is the one from .env; the others are only used if it is busy or unavailable.
function modelChain(first?: string) {
  const preferred = first || process.env.AI_MODEL || 'gemini-3.5-flash-lite';
  return [...new Set([preferred, 'gemini-3-flash-preview', 'gemini-3.1-flash-lite'])];
}

export interface GeminiRequest {
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: 'user' | 'model'; parts: Record<string, unknown>[] }[];
  tools?: unknown[];
  toolConfig?: unknown;
  generationConfig?: Record<string, unknown>;
}

export interface GeminiResponse {
  candidates?: {
    content?: { parts?: Record<string, any>[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generate(
  body: GeminiRequest,
  options: { model?: string; signal?: AbortSignal } = {},
): Promise<GeminiResponse & { model: string }> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new GeminiError(500, 'AI_API_KEY is missing from server/.env');
  const signal = options.signal;

  let lastError: GeminiError | undefined;
  for (const model of modelChain(options.model)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: signal ?? AbortSignal.timeout(45_000),
      });

      if (res.ok) return { ...((await res.json()) as GeminiResponse), model };

      const text = await res.text();
      let message = `Gemini returned ${res.status}`;
      try {
        message = JSON.parse(text).error?.message ?? message;
      } catch {
        /* keep the generic message */
      }
      lastError = new GeminiError(res.status, message);

      if (res.status === 429 || res.status === 503) {
        await wait(800 * (attempt + 1));
        continue; // retry once, then move to the next model
      }
      if (res.status === 404 || res.status === 403) break; // this model is not available to this key
      throw lastError; // a bad request will not get better on another model
    }
  }
  throw lastError ?? new GeminiError(500, 'No Gemini model answered');
}

/** Ask for a JSON answer that follows the given schema, and parse it. */
export async function generateJson<T>(system: string, prompt: string, schema: Record<string, unknown>): Promise<T> {
  const res = await generate({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
    },
  });
  const text = (res.candidates?.[0]?.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  if (!text) throw new GeminiError(502, res.promptFeedback?.blockReason ? 'Gemini blocked this request' : 'Gemini returned no answer');
  return JSON.parse(text) as T;
}
