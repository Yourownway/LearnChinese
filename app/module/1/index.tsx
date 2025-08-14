import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import React, { useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

// ---- Types ----

type Word = {
  id: string;
  hanzi: string; // 汉字
  pinyin: string; // avec accents ex: "nǐ hǎo"
  numeric: string; // avec chiffres ex: "ni3 hao3"
  fr: string; // traduction française principale
  imageUrl?: string; // optionnel (affichera une tuile avec le hanzi si absent)
  audioUrl?: string; // optionnel (joué avec expo-av ; sinon TTS)
};

// ---- Données locales de départ (à éditer manuellement pour l'instant) ----
// Remplacez par vos mots. Ajoutez imageUrl / audioUrl si disponibles.
const WORDS: Word[] = [
  { id: "1", hanzi: "你", pinyin: "nǐ", numeric: "ni3", fr: "tu" },
  { id: "2", hanzi: "好", pinyin: "hǎo", numeric: "hao3", fr: "bien" },
  { id: "3", hanzi: "我", pinyin: "wǒ", numeric: "wo3", fr: "je" },
  { id: "4", hanzi: "爱", pinyin: "ài", numeric: "ai4", fr: "aimer" },
  { id: "5", hanzi: "人", pinyin: "rén", numeric: "ren2", fr: "personne" },
  { id: "6", hanzi: "中", pinyin: "zhōng", numeric: "zhong1", fr: "milieu" },
  { id: "7", hanzi: "国", pinyin: "guó", numeric: "guo2", fr: "pays" },
  { id: "8", hanzi: "学", pinyin: "xué", numeric: "xue2", fr: "apprendre" },
  { id: "9", hanzi: "语", pinyin: "yǔ", numeric: "yu3", fr: "langue" },
  { id: "10", hanzi: "谢", pinyin: "xiè", numeric: "xie4", fr: "remercier" },
];

// ---- Utilitaires Pinyin ----

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
  return src
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü");
}

function placeTone(syllableRaw: string, tone: number) {
  if (tone === 0 || tone === 5) return syllableRaw; // ton neutre
  const syllable = normalizeUmlaut(syllableRaw);
  // règles de placement: a/e d'abord; sinon 'ou' sur o; sinon i/u/ü avec cas 'iu'='u' et 'ui'='i'
  const lower = syllable.toLowerCase();
  let targetIndex = -1;

  const pickIndex = (ch: string) => lower.indexOf(ch);

  if (lower.includes("a")) targetIndex = pickIndex("a");
  else if (lower.includes("e")) targetIndex = pickIndex("e");
  else if (lower.includes("ou")) targetIndex = pickIndex("o");
  else if (lower.includes("iu")) targetIndex = lower.indexOf("iu") + 1; // u
  else if (lower.includes("ui")) targetIndex = lower.indexOf("ui"); // i
  else {
    // dernier des voyelles présentes
    for (let i = lower.length - 1; i >= 0; i--) {
      if (VOWELS.includes(lower[i] as any)) {
        targetIndex = i;
        break;
      }
    }
  }

  if (targetIndex === -1) return syllableRaw; // pas de voyelle

  const vowel = lower[targetIndex];
  const table = DIACRITICS[vowel];
  if (!table) return syllableRaw;
  const marked = table[tone - 1];

  // reconstruire en respectant la casse sur la voyelle marquée
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
  // transforme numérique->accent si chiffres; sinon garde les accents fournis
  const hasDigits = /[1-5]/.test(s);
  const candidate = hasDigits ? numericToMarked(s) : s;
  return stripSpacesAndCase(normalizeUmlaut(candidate));
}

function isPinyinAnswerCorrect(input: string, expectedMarked: string) {
  const canonicalExpected = normalizeMarked(expectedMarked);
  const canonicalInput = normalizeMarked(input);
  const ok = canonicalInput === canonicalExpected;
  const usedNumeric = /[1-5]/.test(input);
  const usedDiacritics = hasDiacritics(input);
  const accentWarning = ok && usedNumeric && !usedDiacritics; // toléré mais on signale
  const missingTones = !ok && !usedNumeric && !usedDiacritics; // pas de tons du tout
  return { ok, accentWarning, missingTones, corrected: numericToMarked(input) };
}

// ---- Helpers jeu ----

type Mode = "hanzi" | "pinyin" | "translation";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildChoices(correct: Word, pool: Word[], count = 5): Word[] {
  const others = pool.filter((w) => w.id !== correct.id);
  const distractors = shuffle(others).slice(0, Math.max(0, count - 1));
  return shuffle([correct, ...distractors]);
}

// ---- Composants UI ----

function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.btn, disabled && { opacity: 0.5 }]}>
      <Text style={styles.btnText}>{title}</Text>
    </Pressable>
  );
}

function ChoiceTile({ word, selected, onPress }: { word: Word; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, selected && styles.tileSelected]}>
      {word.imageUrl ? (
        <Image source={{ uri: word.imageUrl }} style={styles.tileImage} resizeMode="cover" />
      ) : (
        <View style={styles.tileFallback}>
          <Text style={styles.tileHanzi}>{word.hanzi}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ---- Écran principal du jeu ----

export default function Module1Game() {
  const words = WORDS; // remplacer plus tard par données de l'API

  const [mode, setMode] = useState<Mode>(() => pickRandom(["hanzi", "pinyin", "translation"]));
  const [current, setCurrent] = useState<Word>(() => pickRandom(words));
  const [choices, setChoices] = useState<Word[]>(() => buildChoices(current, words));

  const [inputFR, setInputFR] = useState("");
  const [inputPinyin, setInputPinyin] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<null | {
    correct: boolean;
    messages: string[];
  }>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  const hint = useMemo(() => {
    if (mode === "hanzi") return current.hanzi;
    if (mode === "pinyin") return current.pinyin;
    return current.fr;
  }, [mode, current]);

  async function playAudio() {
    // Priorité: audioUrl -> sinon TTS pinyin
    try {
      if (current.audioUrl) {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        const { sound } = await Audio.Sound.createAsync({ uri: current.audioUrl });
        soundRef.current = sound;
        await sound.playAsync();
      } else {
        Speech.speak(current.pinyin, { language: "zh-CN", pitch: 1.0 });
      }
    } catch (e: any) {
      Alert.alert("Audio", "Impossible de jouer l'audio.");
    }
  }

  function resetInputs() {
    setInputFR("");
    setInputPinyin("");
    setSelectedId(null);
    setFeedback(null);
  }

  function makeNewQuestion() {
    const nextWord = pickRandom(words);
    const nextMode = pickRandom(["hanzi", "pinyin", "translation"]);
    setCurrent(nextWord);
    setMode(nextMode);
    setChoices(buildChoices(nextWord, words));
    resetInputs();
  }

  function validate() {
    const messages: string[] = [];
    let correct = true;

    if (mode === "hanzi") {
      // On attend FR + pinyin
      const frOK = inputFR.trim().toLowerCase() === current.fr.toLowerCase();
      if (!frOK) {
        correct = false;
        messages.push(`Traduction attendue : "${current.fr}"`);
      }
      const { ok: pinOK, accentWarning, missingTones, corrected } = isPinyinAnswerCorrect(inputPinyin.trim(), current.pinyin);
      if (!pinOK) {
        correct = false;
        if (missingTones) messages.push("Le pinyin doit inclure les tons (accents ou chiffres). ");
        messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
      } else if (accentWarning) {
        messages.push(`✔ Pinyin correct (numérique). Forme accentuée : "${corrected}".`);
      }
    }

    if (mode === "pinyin") {
      // On attend FR + choix hanzi
      const frOK = inputFR.trim().toLowerCase() === current.fr.toLowerCase();
      if (!frOK) {
        correct = false;
        messages.push(`Traduction attendue : "${current.fr}"`);
      }
      if (selectedId !== current.id) {
        correct = false;
        messages.push("Mauvais caractère choisi.");
      }
    }

    if (mode === "translation") {
      // On attend pinyin + choix hanzi
      const { ok: pinOK, accentWarning, missingTones, corrected } = isPinyinAnswerCorrect(inputPinyin.trim(), current.pinyin);
      if (!pinOK) {
        correct = false;
        if (missingTones) messages.push("Le pinyin doit inclure les tons (accents ou chiffres). ");
        messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
      } else if (accentWarning) {
        messages.push(`✔ Pinyin correct (numérique). Forme accentuée : "${corrected}".`);
      }
      if (selectedId !== current.id) {
        correct = false;
        messages.push("Mauvais caractère choisi.");
      }
    }

    setFeedback({ correct, messages });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={styles.badge}>Indice : {mode === "hanzi" ? "汉字" : mode === "pinyin" ? "Pinyin" : "Traduction FR"}</Text>
        <Text style={mode === "hanzi" ? styles.hintHanzi : styles.hintText}>{hint}</Text>
        <Pressable onPress={playAudio} style={styles.audioBtn}><Text style={styles.audioLabel}>🔊 Écouter</Text></Pressable>
      </View>

      {/* Inputs selon le mode */}
      {mode === "hanzi" && (
        <View style={styles.card}>
          <Text style={styles.label}>Traduction (FR)</Text>
          <TextInput value={inputFR} onChangeText={setInputFR} style={styles.input} placeholder="ex: bien" />

          <Text style={[styles.label, { marginTop: 12 }]}>Pinyin (accents obligatoires; numérique toléré)</Text>
          <TextInput
            value={inputPinyin}
            onChangeText={setInputPinyin}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="ex: nǐ hǎo ou ni3 hao3"
          />
        </View>
      )}

      {mode === "pinyin" && (
        <View style={styles.card}>
          <Text style={styles.label}>Traduction (FR)</Text>
          <TextInput value={inputFR} onChangeText={setInputFR} style={styles.input} placeholder="ex: bien" />

          <Text style={[styles.label, { marginTop: 12 }]}>Choisis le caractère</Text>
          <View style={styles.grid}>
            {choices.map((w) => (
              <ChoiceTile key={w.id} word={w} selected={selectedId === w.id} onPress={() => setSelectedId(w.id)} />)
            )}
          </View>
        </View>
      )}

      {mode === "translation" && (
        <View style={styles.card}>
          <Text style={styles.label}>Pinyin (accents obligatoires; numérique toléré)</Text>
          <TextInput
            value={inputPinyin}
            onChangeText={setInputPinyin}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="ex: nǐ hǎo ou ni3 hao3"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Choisis le caractère</Text>
          <View style={styles.grid}>
            {choices.map((w) => (
              <ChoiceTile key={w.id} word={w} selected={selectedId === w.id} onPress={() => setSelectedId(w.id)} />)
            )}
          </View>
        </View>
      )}

      {feedback ? (
        <View style={[styles.feedback, feedback.correct ? styles.ok : styles.ko]}>
          <Text style={styles.feedbackTitle}>{feedback.correct ? "✅ Correct" : "❌ Incorrect"}</Text>
          {feedback.messages.map((m, i) => (
            <Text key={i} style={styles.feedbackText}>• {m}</Text>
          ))}
          <PrimaryButton title="Question suivante" onPress={makeNewQuestion} />
        </View>
      ) : (
        <PrimaryButton title="Valider" onPress={validate} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  badge: { fontSize: 12, color: "#666", backgroundColor: "#eee", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  hintText: { fontSize: 28, fontWeight: "700" },
  hintHanzi: { fontSize: 64, fontWeight: "800" },
  audioBtn: { marginTop: 8, backgroundColor: "#111", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  audioLabel: { color: "#fff", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  label: { fontSize: 14, color: "#444", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  tile: { width: "30%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", borderWidth: 2, borderColor: "#eee", alignItems: "center", justifyContent: "center" },
  tileSelected: { borderColor: "#111" },
  tileImage: { width: "100%", height: "100%" },
  tileFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f3f3f3" },
  tileHanzi: { fontSize: 36, fontWeight: "800" },
  btn: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  feedback: { gap: 8, padding: 16, borderRadius: 12 },
  feedbackTitle: { fontSize: 18, fontWeight: "800" },
  feedbackText: { fontSize: 14 },
  ok: { backgroundColor: "#e8f8ef" },
  ko: { backgroundColor: "#fdeaea" },
});