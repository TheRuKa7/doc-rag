import { z } from "zod";

export const SourceSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  document_title: z.string(),
  chunk_idx: z.number(),
  score: z.number(),
  snippet: z.string(),
  page: z.number().nullable().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  sources: z.array(SourceSchema).optional(),
  created_at: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  updated_at: z.string(),
  message_count: z.number(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

// Streaming event shape (SSE data frames)
export const StreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), delta: z.string() }),
  z.object({ type: z.literal("sources"), sources: z.array(SourceSchema) }),
  z.object({ type: z.literal("done"), message_id: z.string() }),
  z.object({ type: z.literal("error"), error: z.string() }),
]);
export type StreamEvent = z.infer<typeof StreamEventSchema>;
