import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storage";

type AudioMap = Record<string, string>; // key -> fileUri

export async function lruGetList(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.audioLRU);
  return raw ? JSON.parse(raw) : [];
}

export async function lruGetMap(): Promise<AudioMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.audioMap);
  return raw ? JSON.parse(raw) : {};
}

export async function lruSave(list: string[], map: AudioMap) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.audioLRU, JSON.stringify(list)],
    [STORAGE_KEYS.audioMap, JSON.stringify(map)],
  ]);
}

export async function lruTouch(key: string) {
  const [list, map] = await Promise.all([lruGetList(), lruGetMap()]);
  const idx = list.indexOf(key);
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(key);
  await lruSave(list, map);
}

export async function lruSet(key: string, fileUri: string, max = 5, onDelete?: (fileUri: string) => Promise<void>) {
  const [list, map] = await Promise.all([lruGetList(), lruGetMap()]);
  // update map
  map[key] = fileUri;
  // update list (MRU at head)
  const idx = list.indexOf(key);
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(key);
  // evict
  while (list.length > max) {
    const evicted = list.pop()!;
    const evictedUri = map[evicted];
    delete map[evicted];
    if (evictedUri && onDelete) {
      try { await onDelete(evictedUri); } catch {}
    }
  }
  await lruSave(list, map);
}

export async function lruGetFile(key: string): Promise<string | null> {
  const map = await lruGetMap();
  return map[key] ?? null;
}
