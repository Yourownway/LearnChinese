import wordsLocal from "../constants/words.json";

export type Word = {
  id: string;
  series?: number | null;
  hanzi: string;
  pinyin: string;   // with tones
  numeric: string;  //  ni3 hao3
  pinyinDetails?: string;
  fr: string;
  frDetails?: string;
  audioUrl?: string;
};

export async function loadWordsLocalOnly(): Promise<Word[]> {
  // local JSON now; future: fetch remote + cache
  return wordsLocal as Word[];
}

// Future-ready sample (not used now)
/*
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storage";

const REMOTE_URL = "https://cdn.example.com/words.json";

export async function loadWordsWithCacheFallback(localDefault: Word[]): Promise<Word[]> {
  const cachedRaw = await AsyncStorage.getItem(STORAGE_KEYS.wordsCache);
  const cached = cachedRaw ? JSON.parse(cachedRaw) as Word[] : null;

  // try network, but don't block UI
  fetch(REMOTE_URL).then(async (r) => {
    if (!r.ok) return;
    const data = (await r.json()) as Word[];
    await AsyncStorage.setItem(STORAGE_KEYS.wordsCache, JSON.stringify(data));
  }).catch(() => {});

  return cached ?? localDefault;
}
*/
