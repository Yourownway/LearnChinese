const VOWELS = ["a", "e", "i", "o", "u", "ü"] as const;
const DIACRITICS: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
};

function hasDiacritics(s: string) {
  return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(s);
}

function normalizeUmlaut(src: string) {
  return src.replace(/u:/g, "ü").replace(/v/g, "ü");
}

function placeTone(syllableRaw: string, tone: number) {
  if (tone === 0 || tone === 5) return syllableRaw;
  const syllable = normalizeUmlaut(syllableRaw);
  const lower = syllable.toLowerCase();
  let targetIndex = -1;
  const pickIndex = (ch: string) => lower.indexOf(ch);

  if (lower.includes("a")) targetIndex = pickIndex("a");
  else if (lower.includes("e")) targetIndex = pickIndex("e");
  else if (lower.includes("ou")) targetIndex = pickIndex("o");
  else if (lower.includes("iu")) targetIndex = lower.indexOf("iu") + 1;
  else if (lower.includes("ui")) targetIndex = lower.indexOf("ui");
  else {
    for (let i = lower.length - 1; i >= 0; i--) {
      if (VOWELS.includes(lower[i] as any)) { targetIndex = i; break; }
    }
  }
  if (targetIndex === -1) return syllableRaw;

  const vowel = lower[targetIndex];
  const table = DIACRITICS[vowel];
  if (!table) return syllableRaw;
  const marked = table[tone - 1];
  const res = syllable.slice(0, targetIndex) + marked + syllable.slice(targetIndex + 1);
  return res;
}

function numericSyllableToMarked(syllable: string) {
  const m = syllable.match(/^(.*?)([0-5])$/);
  if (!m) return normalizeUmlaut(syllable);
  const base = m[1];
  const tone = parseInt(m[2], 10);
  return placeTone(base, tone);
}

function numericToMarked(pinyin: string) {
  return pinyin
    .split(/\s+/)
    .filter(Boolean)
    .map((syll) => numericSyllableToMarked(syll))
    .join(" ");
}

function stripSpacesAndCase(s: string) {
  return s.replace(/\s+/g, "").toLowerCase();
}

function normalizeMarked(s: string) {
  const hasDigits = /[1-5]/.test(s);
  const candidate = hasDigits ? numericToMarked(s) : s;
  return stripSpacesAndCase(normalizeUmlaut(candidate));
}

export function isPinyinAnswerCorrect(input: string, expectedMarked: string) {
  const canonicalExpected = normalizeMarked(expectedMarked);
  const canonicalInput = normalizeMarked(input);
  const ok = canonicalInput === canonicalExpected;
  const usedNumeric = /[1-5]/.test(input);
  const usedDiacritics = hasDiacritics(input);
  const accentWarning = ok && usedNumeric && !usedDiacritics;
  const missingTones = !ok && !usedNumeric && !usedDiacritics;
  return { ok, accentWarning, missingTones, corrected: numericToMarked(input) };
}
