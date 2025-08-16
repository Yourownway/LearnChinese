import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { canPlayRemoteAudio, getPlayableAudioSource, playAudioFileOrTTS } from "../../../lib/audio";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";
import { isPinyinAnswerCorrect } from "../../../lib/pinyin";
import { ensureFiveChoices, pickRandom, shuffle } from "../../../lib/utils";

type HintMode = "hanzi" | "pinyin" | "translation";
type GameParams = {
  series?: string;              // "all" or "1,2,3"
  maxQuestions?: string;        // "" = unlimited
  noRepeatHintType?: "0" | "1"; // from settings
  types?: string;               // "hanzi,pinyin,translation"
};

export default function Module1Game() {
  const params = useLocalSearchParams<GameParams>();

  const [words, setWords] = useState<Word[]>([]);
  const [filtered, setFiltered] = useState<Word[]>([]);
  const [shuffledCharacters, setShuffledCharacters] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);

  // inputs
  const [inputFR, setInputFR] = useState("");
  const [inputPinyin, setInputPinyin] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // hint visual “fake textareas”
  const [hintedFR, setHintedFR] = useState("");
  const [hintedPinyin, setHintedPinyin] = useState("");

  // per-question
  const [hintType, setHintType] = useState<HintMode>("hanzi");
  const lastHintTypeRef = useRef<HintMode | null>(null); // avoid re-render loops
  const [choices, setChoices] = useState<Word[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [hintCount, setHintCount] = useState(0); // global per question (max 3, across FR+pinyin)
  const [revealed, setRevealed] = useState(false);
  const [questionDone, setQuestionDone] = useState(false);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const maxErrors = 3;
  const maxHints = 3;

  const maxQuestions = useMemo(() => {
    const raw = params.maxQuestions ?? "";
    const n = String(raw).trim() === "" ? null : Math.max(1, Math.min(200, Number(raw)));
    return n;
  }, [params.maxQuestions]);

  const noRepeatHintType = params.noRepeatHintType === "1";

  // allowed types from settings
  const allowedTypes: HintMode[] = useMemo(() => {
    const raw = (params.types ?? "hanzi,pinyin,translation").split(",").map(s => s.trim()).filter(Boolean);
    const valid = new Set<HintMode>(["hanzi", "pinyin", "translation"]);
    const arr = raw.filter((v): v is HintMode => valid.has(v as HintMode));
    return arr.length ? arr : ["hanzi", "pinyin", "translation"];
  }, [params.types]);

  // load words & filter by series
  useEffect(() => {
    loadWordsLocalOnly()
      .then((all) => {
        setWords(all);
        let filteredList: Word[];
        if (!params.series || params.series === "all") filteredList = all;
        else {
          const set = new Set(params.series.split(",").map((s) => Number(s)));
          filteredList = all.filter((w) => set.has(w.series ?? -999));
        }
        if (filteredList.length < 5) {
          Alert.alert("Sélection insuffisante", "Il faut au moins 5 caractères dans la sélection.");
        }
        setFiltered(filteredList);
        setShuffledCharacters(shuffle(filteredList));
      })
      .catch(() => Alert.alert("Erreur", "Impossible de charger les mots."));
  }, [params.series]);

  // current word
  const current = useMemo(() => {
    return shuffledCharacters[currentIndex % Math.max(1, shuffledCharacters.length)];
  }, [shuffledCharacters, currentIndex]);

  // init question on current change
  useEffect(() => {
    if (!current) return;

    // pick hint type from allowed (respect noRepeat)
    let nextHint: HintMode = pickRandom<HintMode>(allowedTypes);
    if (noRepeatHintType && lastHintTypeRef.current) {
      for (let tries = 0; tries < 10 && nextHint === lastHintTypeRef.current; tries++) {
        nextHint = pickRandom<HintMode>(allowedTypes);
      }
    }
    setHintType(nextHint);
    lastHintTypeRef.current = nextHint;

    // build 5 choices and reset states
    setChoices(ensureFiveChoices(current, filtered));
    setInputFR("");
    setInputPinyin("");
    setHintedFR("");
    setHintedPinyin("");
    setSelectedId(null);
    setErrorCount(0);
    setHintCount(0);
    setRevealed(false);
    setQuestionDone(false);
    setWasCorrect(null);
    setFeedback([]);
  }, [current, allowedTypes, noRepeatHintType, filtered]);

  // ===== HINTS (pistes) =====
  function revealSolution(reason: "3hints" | "3errors") {
    setRevealed(true);
    setQuestionDone(true);
    setWasCorrect(false);
    // Show full solution in fake textareas
    setHintedFR(current.fr);
    setHintedPinyin(current.pinyin);
    const msg =
      reason === "3hints"
        ? `Solution révélée (3 pistes) — 汉字: ${current.hanzi} · Pinyin: ${current.pinyin} · FR: ${current.fr}`
        : `Solution révélée (3 erreurs) — 汉字: ${current.hanzi} · Pinyin: ${current.pinyin} · FR: ${current.fr}`;
    setFeedback(f => [...f, "Dommage !", msg]);
  }

  function addHintFR() {
    if (questionDone || revealed || hintCount >= maxHints) return;
    const expected = current.fr;
    const nextLen = Math.min(expected.length, hintedFR.length + 1);
    if (nextLen === hintedFR.length) return;
    setHintedFR(expected.slice(0, nextLen));
    const nextCount = hintCount + 1;
    setHintCount(nextCount);
    if (nextCount >= maxHints) {
      revealSolution("3hints");
    }
  }

  function addHintPinyin() {
    if (questionDone || revealed || hintCount >= maxHints) return;
    const expected = current.pinyin;
    const nextLen = Math.min(expected.length, hintedPinyin.length + 1);
    if (nextLen === hintedPinyin.length) return;
    setHintedPinyin(expected.slice(0, nextLen));
    const nextCount = hintCount + 1;
    setHintCount(nextCount);
    if (nextCount >= maxHints) {
      revealSolution("3hints");
    }
  }

  function revealByErrorsIfNeeded(newErrors: number) {
    if (newErrors >= maxErrors && !revealed) {
      revealSolution("3errors");
    }
  }

  // ===== VALIDATE =====
  function validate() {
    if (!current || questionDone) return;
    const messages: string[] = [];
    let correct = true;

    if (hintType === "hanzi") {
      // Expect FR + pinyin
      const frOK = inputFR.trim().toLowerCase() === current.fr.toLowerCase();
      if (!frOK) { correct = false; messages.push(`Traduction attendue : "${current.fr}"`); }
      const { ok: pinOK, accentWarning, missingTones, corrected } =
        isPinyinAnswerCorrect(inputPinyin.trim(), current.pinyin);
      if (!pinOK) {
        correct = false;
        if (missingTones) messages.push("Le pinyin doit inclure les tons (accents ou chiffres).");
        messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
      } else if (accentWarning) {
        messages.push(`✔ Pinyin correct (numérique). Forme accentuée : "${corrected}".`);
      }
    }

    if (hintType === "pinyin") {
      // Expect FR + choice hanzi
      const frOK = inputFR.trim().toLowerCase() === current.fr.toLowerCase();
      if (!frOK) { correct = false; messages.push(`Traduction attendue : "${current.fr}"`); }
      if (selectedId !== current.id) { correct = false; messages.push("Mauvais caractère choisi."); }
    }

    if (hintType === "translation") {
      // Expect pinyin + choice hanzi
      const { ok: pinOK, accentWarning, missingTones, corrected } =
        isPinyinAnswerCorrect(inputPinyin.trim(), current.pinyin);
      if (!pinOK) {
        correct = false;
        if (missingTones) messages.push("Le pinyin doit inclure les tons (accents ou chiffres).");
        messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
      } else if (accentWarning) {
        messages.push(`✔ Pinyin correct (numérique). Forme accentuée : "${corrected}".`);
      }
      if (selectedId !== current.id) { correct = false; messages.push("Mauvais caractère choisi."); }
    }

    // scoring
    let delta = 0;
    if (revealed) {
      delta = 0;
    } else {
      if (correct) delta = 5;
      delta -= errorCount; // -1 per error
      delta -= hintCount;  // -1 per hint
      if (delta < 0) delta = 0;
    }
    setScore((s) => s + delta);

    // End of question state
    setQuestionDone(true);
    setWasCorrect(correct && !revealed);

    // Always show full solution when question is done
    setHintedFR(current.fr);
    setHintedPinyin(current.pinyin);

    // Feedback lines + Bravo/Dommage + solution
    const header = correct && !revealed ? "Bravo !" : "Dommage !";
    const solutionLine = `Solution — 汉字: ${current.hanzi} · Pinyin: ${current.pinyin} · FR: ${current.fr}`;
    setFeedback([header, ...messages, solutionLine]);
  }

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (maxQuestions != null && nextIndex >= maxQuestions) {
      Alert.alert("Fin de partie", `Score final : ${score}`, [{ text: "OK" }]);
      // restart quick
      setCurrentIndex(0);
      setScore(0);
      setShuffledCharacters(shuffle(filtered));
      lastHintTypeRef.current = null;
      return;
    }
    setCurrentIndex(nextIndex);
  }

  // audio button state
  const [audioDisabled, setAudioDisabled] = useState(false);
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!current) return;
      const playable = await getPlayableAudioSource(current);
      const canRemote = await canPlayRemoteAudio(playable);
      if (!mounted) return;
      setAudioDisabled(!canRemote);
    })();
    return () => { mounted = false; };
  }, [current]);

  async function onPressAudio() {
    if (audioDisabled || !current) return;
    try {
      await playAudioFileOrTTS(current);
    } catch {
      Alert.alert("Audio", "Impossible de jouer l’audio.");
    }
  }

  if (!current) return null;

  const hintLabel = hintType === "hanzi" ? "汉字" : hintType === "pinyin" ? "Pinyin" : "Traduction FR";
  const hintText = hintType === "hanzi" ? current.hanzi : hintType === "pinyin" ? current.pinyin : current.fr;

  // Which hint buttons to show on this screen
  const showHintFR = hintType === "hanzi" || hintType === "pinyin";
  const showHintPinyin = hintType === "hanzi" || hintType === "translation";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header / hint type */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={styles.badge}>Indice : {hintLabel}</Text>
        <Text style={hintType === "hanzi" ? styles.hintHanzi : styles.hintText}>{hintText}</Text>

        <Pressable onPress={onPressAudio} disabled={audioDisabled} style={[styles.audioBtn, audioDisabled && { opacity: 0.4 }]}>
          <Text style={styles.audioLabel}>🔊 Écouter</Text>
        </Pressable>

        <Text style={styles.score}>Score: {score}</Text>
      </View>

      {/* FR block (fake textarea + input) */}
      {(hintType === "hanzi" || hintType === "pinyin") && (
        <View style={styles.card}>
          <Text style={styles.label}>Traduction (FR)</Text>
          {/* fake textarea shows hints or full solution when done */}
          <View style={styles.fakeArea}><Text style={styles.fakeAreaText}>{hintedFR}</Text></View>
          <TextInput
            value={inputFR}
            onChangeText={setInputFR}
            style={styles.input}
            placeholder="ex: bien"
            editable={!questionDone}
          />
        </View>
      )}

      {/* Pinyin block (fake textarea + input) */}
      {(hintType === "hanzi" || hintType === "translation") && (
        <View style={styles.card}>
          <Text style={styles.label}>Pinyin (accents obligatoires; numérique toléré)</Text>
          <View style={styles.fakeArea}><Text style={styles.fakeAreaText}>{hintedPinyin}</Text></View>
          <TextInput
            value={inputPinyin}
            onChangeText={setInputPinyin}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholder="ex: nǐ hǎo ou ni3 hao3"
            editable={!questionDone}
          />
        </View>
      )}

      {/* Choice tiles */}
      {(hintType === "pinyin" || hintType === "translation") && (
        <View style={styles.card}>
          <Text style={[styles.label, { marginBottom: 8 }]}>Choisis le caractère</Text>
          <View style={styles.grid}>
            {choices.map((w) => {
              const isCorrectTile = w.id === current.id;
              const tileStyles = [
                styles.tile,
                selectedId === w.id && !questionDone && styles.tileSelected,
                questionDone && isCorrectTile && styles.tileSolution,
              ];
              return (
                <Pressable
                  key={w.id}
                  onPress={() => !questionDone && setSelectedId(w.id)}
                  disabled={questionDone}
                  style={tileStyles}
                >
                  <Text style={styles.tileHanzi}>{w.hanzi}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Actions */}
      {!questionDone ? (
        <View style={styles.actions}>
          <Pressable
            onPress={addHintPinyin}
            disabled={revealed || hintCount >= 3 || !showHintPinyin}
            style={[styles.btn, (revealed || hintCount >= 3 || !showHintPinyin) && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>Hint Pinyin ({hintCount}/3)</Text>
          </Pressable>
          <Pressable
            onPress={addHintFR}
            disabled={revealed || hintCount >= 3 || !showHintFR}
            style={[styles.btn, (revealed || hintCount >= 3 || !showHintFR) && styles.btnDisabled]}
          >
            <Text style={styles.btnText}>Hint FR ({hintCount}/3)</Text>
          </Pressable>
          <Pressable onPress={validate} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Valider</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable onPress={goNext} style={styles.btnPrimary}>
            <Text style={styles.btnPrimaryText}>Question suivante</Text>
          </Pressable>
        </View>
      )}

      {feedback.length > 0 && (
        <View style={styles.feedback}>
          {feedback.map((m, i) => (
            <Text key={i} style={styles.feedbackText}>• {m}</Text>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
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
  score: { marginTop: 8, fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, elevation: 3, gap: 6 },
  label: { fontSize: 14, color: "#444" },
  // fake textarea
  fakeArea: { borderWidth: 1, borderColor: "#eee", backgroundColor: "#fafafa", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: "center" },
  fakeAreaText: { color: "#333", fontSize: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  tile: { width: "30%", aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: "#eee", alignItems: "center", justifyContent: "center", backgroundColor: "#f7f7f7" },
  tileSelected: { borderColor: "#111" },
  tileSolution: { borderColor: "#0a84ff", borderWidth: 3, backgroundColor: "#eef6ff" }, // outline correct character when done
  tileHanzi: { fontSize: 36, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "stretch" },
  btn: { backgroundColor: "#333", paddingVertical: 14, borderRadius: 12, alignItems: "center", flex: 1 },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnPrimary: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 12, alignItems: "center", flex: 1 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  feedback: { marginTop: 10, gap: 6, backgroundColor: "#f2f2f2", borderRadius: 12, padding: 12 },
  feedbackText: { fontSize: 14 },
});
