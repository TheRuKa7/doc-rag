import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { listMessages, streamChat } from "../../lib/api";
import { Message, Source } from "../../lib/types";

function SourceChip({ s }: { s: Source }) {
  return (
    <View className="rounded-full border border-border bg-background/60 px-2 py-1 mr-2 mb-1">
      <Text className="text-muted text-[11px]" numberOfLines={1}>
        {s.document_title}
        {s.page != null ? ` · p.${s.page}` : ""} · {(s.score * 100).toFixed(0)}%
      </Text>
    </View>
  );
}

function Bubble({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <View className={`mb-3 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className={`rounded-2xl px-3 py-2 max-w-[85%] ${isUser ? "bg-user" : "bg-assistant border border-border"}`}
      >
        <Text className="text-white leading-6">{m.content}</Text>
      </View>
      {m.sources && m.sources.length > 0 ? (
        <View className="flex-row flex-wrap mt-2 max-w-[85%]">
          {m.sources.map((s) => (
            <SourceChip key={s.id} s={s} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listRef = useRef<FlatList>(null);
  const q = useQuery({
    queryKey: ["messages", id],
    queryFn: () => listMessages(id!),
    enabled: !!id,
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pending, setPending] = useState<Message | null>(null);

  async function send() {
    if (!input.trim() || !id || streaming) return;
    const prompt = input.trim();
    setInput("");
    setStreaming(true);

    const userMsg: Message = {
      id: `tmp-u-${Date.now()}`,
      role: "user",
      content: prompt,
      created_at: new Date().toISOString(),
    };
    const asst: Message = {
      id: `tmp-a-${Date.now()}`,
      role: "assistant",
      content: "",
      sources: [],
      created_at: new Date().toISOString(),
    };

    // Optimistically insert user + empty assistant
    q.refetch(); // not awaited; we prepend locally via pending
    setPending(asst);
    // draw user bubble immediately — next render appends pending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userMsg as any).__local = true;

    try {
      await streamChat(id, prompt, (ev) => {
        if (ev.type === "token") {
          setPending((p) => (p ? { ...p, content: p.content + ev.delta } : p));
        } else if (ev.type === "sources") {
          setPending((p) => (p ? { ...p, sources: ev.sources } : p));
        } else if (ev.type === "done") {
          setPending((p) => (p ? { ...p, id: ev.message_id } : p));
        } else if (ev.type === "error") {
          setPending((p) => (p ? { ...p, content: p.content + `\n\n[error] ${ev.error}` } : p));
        }
      });
    } finally {
      setStreaming(false);
      q.refetch();
      setPending(null);
    }
  }

  const data: Message[] = [...(q.data ?? []), ...(pending ? [pending] : [])];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
      className="flex-1 bg-background"
    >
      {q.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => <Bubble m={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text className="text-muted text-center mt-16">
              Ask anything about your corpus.
            </Text>
          }
        />
      )}

      <View className="flex-row items-end gap-2 p-3 border-t border-border bg-surface">
        <TextInput
          className="flex-1 rounded-xl bg-background border border-border text-white px-3 py-2 max-h-28"
          placeholder="Ask about your docs…"
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={streaming || !input.trim()}
          className="h-10 w-10 rounded-xl bg-primary items-center justify-center disabled:opacity-40"
        >
          {streaming ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="white" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
