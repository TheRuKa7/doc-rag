import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  apiBaseUrl: string;
  apiKey: string;
  setApiBaseUrl: (u: string) => void;
  setApiKey: (k: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiBaseUrl: "http://10.0.2.2:8000",
      apiKey: "",
      setApiBaseUrl: (u) => set({ apiBaseUrl: u }),
      setApiKey: (k) => set({ apiKey: k }),
    }),
    { name: "doc-rag-settings", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
