import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { generate, GeminiError, type GeminiRequest } from './gemini';

// Studio's agents run in the browser. They send each turn here, and this turns it into a Gemini
// request, so the Gemini key never reaches the page. The answer goes back in a simple shape.

interface Item {
  type: string;
  role?: string;
  content?: { type: string; text?: string }[];
  callId?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

interface Tool {
  name: string;
  description?: string;
  parameters?: unknown;
  kind?: string;
}

interface Body {
  input?: Item[];
  instructions?: string;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | 'required' | { name: string };
  responseFormat?: { type: 'text' | 'json'; schema?: unknown };
  signatures?: Record<string, string>;
}

const textOf = (item: Item) => (item.content ?? []).map((c) => c.text ?? '').join('');

function parseJson(value: string | undefined) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return { value };
  }
}

export function toGeminiRequest(body: Body): GeminiRequest {
  const items = body.input ?? [];
  const system: string[] = body.instructions ? [body.instructions] : [];
  const nameByCall = new Map<string, string>();
  const contents: GeminiRequest['contents'] = [];

  const push = (role: 'user' | 'model', part: Record<string, unknown>) => {
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(part);
    else contents.push({ role, parts: [part] });
  };

  for (const item of items) {
    if (item.type === 'message' && item.role === 'system') {
      system.push(textOf(item));
    } else if (item.type === 'message' && item.role === 'user') {
      push('user', { text: textOf(item) });
    } else if (item.type === 'message' && item.role === 'assistant') {
      const text = textOf(item);
      if (text) push('model', { text });
    } else if (item.type === 'function_call' && item.callId && item.name) {
      nameByCall.set(item.callId, item.name);
      const part: Record<string, unknown> = { functionCall: { name: item.name, args: parseJson(item.arguments) } };
      // Gemini 3 wants the signature it gave us for each earlier tool call. Where we no longer have one
      // (for example a call from a helper agent's history) Google's documented placeholder is used.
      part.thoughtSignature = body.signatures?.[item.callId] ?? 'skip_thought_signature_validator';
      push('model', part);
    } else if (item.type === 'function_call_output' && item.callId) {
      const parsed = parseJson(item.output);
      push('user', {
        functionResponse: {
          name: nameByCall.get(item.callId) ?? 'tool',
          response: typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : { result: parsed },
        },
      });
    }
  }
  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });

  const request: GeminiRequest = {
    contents,
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
  };
  if (system.length) request.systemInstruction = { parts: [{ text: system.join('\n\n') }] };

  const declarations = (body.tools ?? [])
    .filter((t) => t.kind !== 'provided')
    .map((t) => ({ name: t.name, description: t.description ?? '', parametersJsonSchema: t.parameters ?? { type: 'object', properties: {} } }));
  if (declarations.length && body.toolChoice !== 'none') {
    request.tools = [{ functionDeclarations: declarations }];
    const choice = body.toolChoice;
    request.toolConfig = {
      functionCallingConfig:
        choice === 'required'
          ? { mode: 'ANY' }
          : typeof choice === 'object' && choice
            ? { mode: 'ANY', allowedFunctionNames: [choice.name] }
            : { mode: 'AUTO' },
    };
  }

  if (body.responseFormat?.type === 'json' && body.responseFormat.schema) {
    request.generationConfig = {
      ...request.generationConfig,
      responseMimeType: 'application/json',
      responseJsonSchema: body.responseFormat.schema,
    };
  }
  return request;
}

// A simple allowance so a runaway agent cannot burn through the free tier.
const windowMs = 60_000;
const maxCalls = 40;
let calls: number[] = [];

export async function llmHandler(req: Request, res: Response) {
  const now = Date.now();
  calls = calls.filter((t) => now - t < windowMs);
  if (calls.length >= maxCalls) return res.status(429).json({ error: 'Too many AI requests. Wait a minute and try again.' });
  calls.push(now);

  try {
    // Studio's tool definitions are intricate, so the agents use a stronger model than the one-shot reader.
    const result = await generate(toGeminiRequest(req.body as Body), { model: process.env.AI_AGENT_MODEL || 'gemini-3-flash-preview', timeoutMs: 50_000 });
    const parts = result.candidates?.[0]?.content?.parts ?? [];
    res.json({
      model: result.model,
      text: parts.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join(''),
      toolCalls: parts
        .filter((p) => p.functionCall)
        .map((p) => ({
          id: p.functionCall.id ?? `call_${randomUUID().slice(0, 8)}`,
          name: p.functionCall.name,
          args: p.functionCall.args ?? {},
          thoughtSignature: p.thoughtSignature ?? null,
        })),
      finishReason: result.candidates?.[0]?.finishReason ?? null,
      blocked: result.promptFeedback?.blockReason ?? null,
      usage: result.usageMetadata ?? null,
    });
  } catch (e) {
    const status = e instanceof GeminiError ? (e.status === 429 ? 429 : 502) : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'AI request failed' });
  }
}
