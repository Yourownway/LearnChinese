import strokes from "@/constants/strokes.json";

export function getStrokePaths(hanzi: string): string[][] {
  return (strokes as Record<string, string[][]>)[hanzi] || [];
}
