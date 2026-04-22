import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSettings } from "../../lib/store";

export default function Settings() {
  const { apiBaseUrl, apiKey, setApiBaseUrl, setApiKey } = useSettings();
  const [url, setUrl] = useState(apiBaseUrl);
  const [key, setKey] = useState(apiKey);

  return (
    <ScrollView className="bg-background" contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View>
        <Text className="text-white font-semibold mb-1">API base URL</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface text-white px-3 py-3"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text className="text-muted text-xs mt-1">
          Points at the FastAPI server. Android emulator: http://10.0.2.2:8000
        </Text>
      </View>
      <View>
        <Text className="text-white font-semibold mb-1">API key</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface text-white px-3 py-3"
          value={key}
          onChangeText={setKey}
          autoCapitalize="none"
          secureTextEntry
        />
      </View>
      <Pressable
        className="rounded-xl bg-primary py-3 items-center active:opacity-80"
        onPress={() => {
          setApiBaseUrl(url.trim());
          setApiKey(key.trim());
          Alert.alert("Saved");
        }}
      >
        <Text className="text-white font-semibold">Save</Text>
      </Pressable>
    </ScrollView>
  );
}
