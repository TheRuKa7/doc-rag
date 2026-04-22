# doc-rag-mobile

A streaming-chat Expo app for `doc-rag`. Ask questions on your private corpus,
see the answer token-stream in, and tap through the retrieved source chunks.

## Stack

- Expo SDK 52 + Expo Router v4
- TanStack Query for conversation lists
- Raw `fetch` + ReadableStream for SSE (React Native has no `EventSource`)
- NativeWind v4 + Zod + Zustand

## Screens

| Route                 | Purpose                                        |
|-----------------------|------------------------------------------------|
| `/(tabs)/`            | Conversation list + new-chat FAB               |
| `/(tabs)/settings`    | API base URL + key                             |
| `/chat/[id]`          | Streaming chat with source chips per assistant |

## Backend contract

- `GET  /conversations`
- `POST /conversations`
- `GET  /conversations/:id/messages`
- `POST /chat/stream` → SSE frames:
  - `data: {"type":"token","delta":"…"}`
  - `data: {"type":"sources","sources":[…]}`
  - `data: {"type":"done","message_id":"…"}`
  - `data: {"type":"error","error":"…"}`

Source objects carry `document_title`, `page`, `score`, and a short
`snippet` (rendered as chips; long-form source viewer is a follow-up screen).

## Run

```bash
cd mobile
pnpm install
pnpm start
pnpm android | pnpm ios
```
