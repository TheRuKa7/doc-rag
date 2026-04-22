import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { createConversation, listConversations } from "../../lib/api";

export default function Conversations() {
  const qc = useQueryClient();
  const router = useRouter();
  const q = useQuery({ queryKey: ["conversations"], queryFn: listConversations });
  const create = useMutation({
    mutationFn: createConversation,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      router.push(`/chat/${c.id}`);
    },
  });

  if (q.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <FlatList
        contentContainerStyle={{ padding: 16, gap: 8 }}
        data={q.data}
        keyExtractor={(c) => c.id}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListEmptyComponent={
          <Text className="text-muted text-center mt-16">
            No conversations yet. Tap + to ask your first question.
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={`/chat/${item.id}`} asChild>
            <Pressable className="rounded-xl border border-border bg-surface p-3 active:opacity-70">
              <Text className="text-white font-medium" numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text className="text-muted text-xs mt-1">
                {item.message_count} messages · {new Date(item.updated_at).toLocaleDateString()}
              </Text>
            </Pressable>
          </Link>
        )}
      />
      <Pressable
        onPress={() => create.mutate()}
        disabled={create.isPending}
        className="absolute right-5 bottom-5 h-14 w-14 rounded-full bg-primary items-center justify-center active:opacity-80"
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
    </View>
  );
}
