import * as FileSystem from "expo-file-system";
import * as Network from "expo-network";
import * as Speech from "expo-speech";
// @ts-ignore - allow importing expo-audio even if types differ locally
import * as ExpoAudio from "expo-audio";
import type { Word } from "./data";
import { lruGetFile, lruSet, lruTouch } from "./lruCache";

function keyForRemote(url: string) {
  // stable key; keep it simple/URL-encoded
  return `file:${encodeURIComponent(url)}`;
}

export async function canPlayRemoteAudio(playable: { type: "remote"; url: string } | { type: "none" } | { type: "tts" }) {
  if (playable.type === "none") return false;
  if (playable.type === "tts") return true; // TTS does not need network
  const key = keyForRemote(playable.url);
  const cached = await lruGetFile(key);
  if (cached) return true; // local file present
  const state = await Network.getNetworkStateAsync();
  return !!state.isConnected && !!state.isInternetReachable;
}

export async function getPlayableAudioSource(word: Word) {
  if (word.audioUrl) return { type: "remote" as const, url: word.audioUrl };
  return { type: "tts" as const };
}

async function downloadIfNeeded(url: string): Promise<string | null> {
  const key = keyForRemote(url);
  const cached = await lruGetFile(key);
  if (cached) {
    await lruTouch(key);
    return cached;
  }
  const state = await Network.getNetworkStateAsync();
  if (!state.isConnected || !state.isInternetReachable) {
    return null;
  }
  const fileName = encodeURIComponent(url);
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  try {
    await FileSystem.downloadAsync(url, dest);
    await lruSet(key, dest, 5, async (uri) => {
      try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch {}
    });
    return dest;
  } catch {
    return null;
  }
}

let currentPlayer: any | null = null;

async function playLocalFile(uri: string) {
  // Generic wrapper to handle expo-audio variations
  try {
    // Try a common pattern (may vary by version)
    if (currentPlayer) {
      try { await currentPlayer.stopAsync?.(); } catch {}
      try { await currentPlayer.unloadAsync?.(); } catch {}
      currentPlayer = null;
    }
    // Attempt API shape #1
    if ((ExpoAudio as any).Sound?.createAsync) {
      const { sound } = await (ExpoAudio as any).Sound.createAsync({ uri });
      currentPlayer = sound;
      await sound.playAsync();
      return;
    }
    // Attempt API shape #2 (player)
    if ((ExpoAudio as any).Audio?.Sound?.createAsync) {
      const { sound } = await (ExpoAudio as any).Audio.Sound.createAsync({ uri });
      currentPlayer = sound;
      await sound.playAsync();
      return;
    }
    // Fallback: try to open via WebAudio-like (no-op)
    throw new Error("expo-audio: unsupported API shape");
  } catch (e) {
    throw e;
  }
}

export async function playAudioFileOrTTS(word: Word) {
  if (word.audioUrl) {
    const fileUri = await downloadIfNeeded(word.audioUrl);
    if (!fileUri) {
      // cannot download and no cache -> try nothing; caller should have disabled button already
      throw new Error("no-audio-available");
    }
    await playLocalFile(fileUri);
    return;
  }
  // TTS fallback
  await Speech.speak(word.pinyin, { language: "zh-CN", pitch: 1.0 });
}
