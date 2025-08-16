import type { Word } from "./data";

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function ensureFiveChoices(correct: Word, source: Word[]): Word[] {
  const others = source.filter((w) => w.id !== correct.id);
  const distractors = shuffle(others).slice(0, Math.max(0, 4));
  return shuffle([correct, ...distractors]);
}
