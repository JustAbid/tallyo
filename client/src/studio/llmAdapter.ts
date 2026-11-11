import type { AgLlmAdapter, AgLlmRequest, AgLlmResponse } from 'ag-studio';

// Studio's agents run in the browser, but the model is called from our own server (/api/llm),
// so the Gemini key never reaches the page. This adapter translates between the two.

interface ServerTurn {
  model: string;
  text: string;
  toolCalls: { id: string; name: string; args: unknown; thoughtSignature: string | null }[];
  finishReason: string | null;
  blocked: string | null;
  usage: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | null;
}

// Gemini 3 hands back a signature with each tool call and wants it echoed on the next turn.
const signatures = new Map<string, string>();

async function callServer(endpoint: string, request: AgLlmRequest, signal?: AbortSignal): Promise<ServerTurn> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      input: request.input,
      instructions: request.instructions,
      tools: request.tools?.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters, kind: t.kind })),
      toolChoice: request.toolChoice,
      responseFormat: request.responseFormat,
      signatures: Object.fromEntries(signatures),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The AI request failed (${res.status})`);
  return body as ServerTurn;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${counter++}`;

export function tallyoAdapter(endpoint = '/api/llm'): AgLlmAdapter {
  return {
    executeTurn(request, options) {
      const turn = callServer(endpoint, request, options?.signal);
      turn.catch(() => {}); // failures are reported through `complete`, not as an unhandled rejection

      async function* stream() {
        let result: ServerTurn;
        try {
          result = await turn;
        } catch {
          return;
        }
        if (result.text) {
          const messageId = nextId('msg');
          yield { type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' } as const;
          yield { type: 'TEXT_MESSAGE_CONTENT', messageId, delta: result.text } as const;
          yield { type: 'TEXT_MESSAGE_END', messageId } as const;
        }
        for (const call of result.toolCalls) {
          yield { type: 'TOOL_CALL_START', toolCallId: call.id, toolCallName: call.name } as const;
          yield { type: 'TOOL_CALL_ARGS', toolCallId: call.id, delta: JSON.stringify(call.args) } as const;
          yield { type: 'TOOL_CALL_END', toolCallId: call.id } as const;
        }
      }

      const complete = turn.then(
        (result): AgLlmResponse => {
          const output: AgLlmResponse['output'] = [];
          if (result.text) {
            output.push({
              id: nextId('msg'),
              kind: 'output',
              type: 'message',
              role: 'assistant',
              status: 'completed',
              content: [{ type: 'text', text: result.text, annotations: [] }],
            });
          }
          for (const call of result.toolCalls) {
            if (call.thoughtSignature) signatures.set(call.id, call.thoughtSignature);
            output.push({
              id: nextId('fc'),
              kind: 'output',
              type: 'function_call',
              callId: call.id,
              name: call.name,
              arguments: JSON.stringify(call.args),
              status: 'completed',
            });
          }
          const failed = !output.length;
          return {
            id: nextId('resp'),
            createdAt: Date.now(),
            output,
            model: result.model,
            status: failed ? 'incomplete' : 'completed',
            incompleteDetails: failed ? { reason: result.blocked ? 'content_filter' : 'max_output_tokens' } : undefined,
          };
        },
        (error: unknown): AgLlmResponse => ({
          id: nextId('resp'),
          createdAt: Date.now(),
          output: [],
          status: 'failed',
          error: { code: 'llm_error', message: error instanceof Error ? error.message : 'The AI request failed' },
        }),
      );

      return { stream: stream() as any, complete };
    },
  };
}
