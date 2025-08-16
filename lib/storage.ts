export const STORAGE_KEYS = {
  wordsCache: "words@v1", // for future API mode
  audioLRU: "audioLRU@v1", // list of keys (most recent first)
  audioMap: "audioMap@v1", // key -> localFileUri
  history: "history@v1",   // game sessions
} as const;
