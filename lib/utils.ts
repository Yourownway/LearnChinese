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

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isFrenchAnswerCorrect(input: string, expected: string): boolean {
  const normalize = (str: string) =>
    stripAccents(str.trim().toLowerCase().replace(/[\u2019']/g, " "));
  const expectedParts = expected
    .split("/")
    .map((part) => normalize(part).replace(/\s+/g, " "));
  const inputNorm = normalize(input).replace(/\s+/g, " ");
  if (expectedParts.includes(inputNorm)) return true;
  if (expectedParts.length > 1 && inputNorm === expectedParts.join(" ")) return true;
  return false;
}

export function formatFr(expected: string): string {
  return expected.replace(/\//g, " ");
}
