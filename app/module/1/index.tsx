import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FauxTextarea } from "../../../components/FauxTextarea";
import { useToast } from "../../../components/Toast";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
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
  const { colors, tx } = useTheme();
  const toast = useToast();

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
  const lastHintTypeRef = useRef<HintMode | null>(null);
  const [choices, setChoices] = useState<Word[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [hintCount, setHintCount] = useState(0); // global per question (max 3)
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

  // Build pinyin index ONCE per filtered change (O(N))
  const pinyinIndex = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const w of filtered) {
      const keys = [w.pinyin, (w.numeric || "").toLowerCase()].filter(Boolean);
      for (const k of keys) {
        if (!m.has(k)) m.set(k, new Set());
        m.get(k)!.add(w.id);
      }
    }
    return m;
  }, [filtered]);

  // current word
  const current = useMemo(() => {
    return shuffledCharacters[currentIndex % Math.max(1, shuffledCharacters.length)];
  }, [shuffledCharacters, currentIndex]);

  // Accepted IDs for homophones from index (O(1) lookup)
  const acceptedIds = useMemo(() => {
    if (!current) return new Set<string>();
    const set = new Set<string>();
    const k1 = current.pinyin;
    const k2 = (current.numeric || "").toLowerCase();
    pinyinIndex.get(k1)?.forEach(id => set.add(id));
    if (k2) pinyinIndex.get(k2)?.forEach(id => set.add(id));
    return set;
  }, [current, pinyinIndex]);

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
    setHintedFR(current.fr);
    setHintedPinyin(current.pinyin);

    const hanziSolutions =
      Array.from(acceptedIds)
        .map(id => filtered.find(w => w.id === id)?.hanzi || choices.find(w => w.id === id)?.hanzi || "")
        .filter(Boolean)
        .join(" / ") || current.hanzi;

    const msg =
      reason === "3hints"
        ? `Solution révélée (3 pistes) — 汉字: ${hanziSolutions} · Pinyin: ${current.pinyin} · FR: ${current.fr}`
        : `Solution révélée (3 erreurs) — 汉字: ${hanziSolutions} · Pinyin: ${current.pinyin} · FR: ${current.fr}`;
    setFeedback(f => [...f, "Dommage !", msg]);
    toast.show("Dommage…", "error");
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
      // Expect FR + choice hanzi (accept multi homophones)
      const frOK = inputFR.trim().toLowerCase() === current.fr.toLowerCase();
      if (!frOK) { correct = false; messages.push(`Traduction attendue : "${current.fr}"`); }
      const isAccepted = selectedId != null && acceptedIds.has(selectedId);
      if (!isAccepted) { correct = false; messages.push("Mauvais caractère choisi."); }
    }

    if (hintType === "translation") {
      // Expect pinyin + choice hanzi (accept multi homophones)
      const { ok: pinOK, accentWarning, missingTones, corrected } =
        isPinyinAnswerCorrect(inputPinyin.trim(), current.pinyin);
      if (!pinOK) {
        correct = false;
        if (missingTones) messages.push("Le pinyin doit inclure les tons (accents ou chiffres).");
        messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
      } else if (accentWarning) {
        messages.push(`✔ Pinyin correct (numérique). Forme accentuée : "${corrected}".`);
      }
      const isAccepted = selectedId != null && acceptedIds.has(selectedId);
      if (!isAccepted) { correct = false; messages.push("Mauvais caractère choisi."); }
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

    // Feedback lines + Bravo/Dommage + solution (list all accepted hanzi if multiple)
    const header = correct && !revealed ? "Bravo !" : "Dommage !";
    const hanziSolutions =
      Array.from(acceptedIds)
        .map(id => filtered.find(w => w.id === id)?.hanzi || choices.find(w => w.id === id)?.hanzi || "")
        .filter(Boolean)
        .join(" / ") || current.hanzi;

    const solutionLine = `Solution — 汉字: ${hanziSolutions} · Pinyin: ${current.pinyin} · FR: ${current.fr}`;
    setFeedback([header, ...messages, solutionLine]);

    // Toast
    toast.show(correct && !revealed ? "Bravo !" : "Dommage…", correct ? "success" : "error");
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      {/* Header / hint type */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text
          style={{
            fontSize: tx(12),
            color: colors.muted,
            backgroundColor: colors.card,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          Indice : {hintLabel}
        </Text>
        <Text
          style={{
            fontSize: hintType === "hanzi" ? tx(64) : tx(28),
            fontWeight: "800",
            color: colors.text,
          }}
        >
          {hintText}
        </Text>

        <Pressable
          onPress={onPressAudio}
          disabled={audioDisabled}
          style={[
            {
              marginTop: 8,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            },
            audioDisabled && { opacity: 0.4 },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>🔊 Écouter</Text>
        </Pressable>

        <Text style={{ marginTop: 8, fontWeight: "700", color: colors.text }}>
          Score: {score}
        </Text>
      </View>

      {/* FR block (FauxTextarea + input) */}
      {(hintType === "hanzi" || hintType === "pinyin") && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: tx(14), color: colors.muted }}>Traduction (FR)</Text>
          <FauxTextarea value={hintedFR} disabled={questionDone || revealed} placeholder="—" />
          <TextInput
            value={inputFR}
            onChangeText={setInputFR}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: tx(16),
              color: colors.text,
              backgroundColor: colors.background,
            }}
            placeholder="ex: bien"
            placeholderTextColor={colors.muted}
            editable={!questionDone}
          />
        </View>
      )}

      {/* Pinyin block (FauxTextarea + input) */}
      {(hintType === "hanzi" || hintType === "translation") && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: tx(14), color: colors.muted }}>
            Pinyin (accents obligatoires; numérique toléré)
          </Text>
          <FauxTextarea value={hintedPinyin} disabled={questionDone || revealed} placeholder="—" />
          <TextInput
            value={inputPinyin}
            onChangeText={setInputPinyin}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: tx(16),
              color: colors.text,
              backgroundColor: colors.background,
            }}
            placeholder="ex: nǐ hǎo ou ni3 hao3"
            placeholderTextColor={colors.muted}
            editable={!questionDone}
          />
        </View>
      )}

      {/* Choice tiles */}
      {(hintType === "pinyin" || hintType === "translation") && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: tx(14), color: colors.muted, marginBottom: 8 }}>
            Choisis le caractère
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {choices.map((w) => {
              const selected = selectedId === w.id && !questionDone;
              const isSolution = questionDone && acceptedIds.has(w.id); // highlight all accepted hanzi
              const baseStyle = {
                width: "30%" as const,
                aspectRatio: 1,
                borderRadius: 12,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.text : colors.border,
                alignItems: "center" as const,
                justifyContent: "center" as const,
                backgroundColor: colors.background,
              };
              const solutionStyle = isSolution
                ? { borderColor: colors.accent, borderWidth: 3, backgroundColor: colors.background }
                : null;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => !questionDone && setSelectedId(w.id)}
                  disabled={questionDone}
                  style={[baseStyle, solutionStyle]}
                >
                  <Text style={{ fontSize: tx(36), fontWeight: "800", color: colors.text }}>
                    {w.hanzi}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Actions */}
      {!questionDone ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          <ZenButton
            title={`Hint Pinyin (${hintCount}/3)`}
            onPress={addHintPinyin}
            disabled={revealed || hintCount >= 3 || !showHintPinyin}
          />
          <ZenButton
            title={`Hint FR (${hintCount}/3)`}
            onPress={addHintFR}
            disabled={revealed || hintCount >= 3 || !showHintFR}
          />
          <ZenButton title="Valider" onPress={validate} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <ZenButton title="Question suivante" onPress={goNext} />
        </View>
      )}

      {feedback.length > 0 && (
        <View
          style={{
            marginTop: 10,
            gap: 6,
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {feedback.map((m, i) => (
            <Text key={i} style={{ fontSize: tx(14), color: colors.text }}>
              • {m}
            </Text>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
