import { z } from "zod";
import { useSettings } from "./store";
import {
  Conversation,
  ConversationSchema,
  Message,
  MessageSchema,
  StreamEvent,
  StreamEventSchema,
} from "./types";

function headers(): Record<string, string> {
  const { apiKey } = useSettings.getState();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) h.Authorization = `Bearer ${apiKey}`;
  return h;
}

export async function listConversations(): Promise<Conversation[]> {
  const { apiBaseUrl } = useSettings.getState();
  const r = await fetch(`${apiBaseUrl}/conversations`, { headers: headers() });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return z.array(ConversationSchema).parse(await r.json());
}

export async function listMessages(convId: string): Promise<Message[]> {
  const { apiBaseUrl } = useSettings.getState();
  const r = await fetch(`${apiBaseUrl}/conversations/${convId}/messages`, {
    headers: headers(),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return z.array(MessageSchema).parse(await r.json());
}

export async function createConversation(): Promise<Conversation> {
  const { apiBaseUrl } = useSettings.getState();
  const r = await fetch(`${apiBaseUrl}/conversations`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ConversationSchema.parse(await r.json());
}

/**
 * Server-Sent Events streaming. Parses `data: {json}\n\n` frames manually
 * because React Native fetch doesn't ship an EventSource.
 */
export async function streamChat(
  convId: string,
  userMessage: string,
  onEvent: (ev: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const { apiBaseUrl } = useSettings.getState();
  const res = await fetch(`${apiBaseUrl}/chat/stream`, {
    method: "POST",
    headers: { ...headers(), Accept: "text/event-stream" },
    body: JSON.stringify({ conversation_id: convId, message: userMessage }),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const frames = buf.split("\n\n");
    buf = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = StreamEventSchema.parse(JSON.parse(payload));
        onEvent(ev);
      } catch {
        // ignore malformed frames rather than tearing down the stream
      }
    }
  }
}
