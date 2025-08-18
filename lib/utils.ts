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
  // Pick up to four distractors (less if there aren't enough words left)
  const distractors = shuffle(others).slice(0, Math.min(4, others.length));
  return shuffle([correct, ...distractors]);
}
