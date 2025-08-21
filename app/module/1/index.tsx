import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FauxTextarea } from "../../../components/FauxTextarea";
import { useToast } from "../../../components/Toast";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { canPlayRemoteAudio, getPlayableAudioSource, playAudioFileOrTTS } from "../../../lib/audio";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";
import { isPinyinAnswerCorrect } from "../../../lib/pinyin";
import { ensureFiveChoices, pickRandom, shuffle, isFrenchAnswerCorrect, formatFr } from "../../../lib/utils";

type HintMode = "hanzi" | "pinyin" | "translation";
type AnswerMode = "hanzi" | "pinyin" | "translation";
type GameParams = {
  series?: string;              // "all" or "1,2,3"
  maxQuestions?: string;        // nombre total de questions
  noRepeatHintType?: "0" | "1"; // from settings
  types?: string;               // "hanzi,pinyin,translation" for hints
  answer?: string;              // expected answer element
  pinyinMode?: "input" | "choice";
  frMode?: "input" | "choice";
};

export default function Module1Game() {
  const params = useLocalSearchParams<GameParams>();
  const router = useRouter();
  const { colors, tx } = useTheme();
  const toast = useToast();

  const [filtered, setFiltered] = useState<Word[]>([]);
  const originalFilteredRef = useRef<Word[]>([]);
  const [shuffledCharacters, setShuffledCharacters] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Word[]>([]);

  // inputs
  const [inputFR, setInputFR] = useState("");
  const [inputPinyin, setInputPinyin] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFrId, setSelectedFrId] = useState<string | null>(null);
  const [selectedPinyinId, setSelectedPinyinId] = useState<string | null>(null);

  // per-question
  const [hintType, setHintType] = useState<HintMode>("hanzi");
  const lastHintTypeRef = useRef<HintMode | null>(null);
  const [choices, setChoices] = useState<Word[]>([]);
  const [questionDone, setQuestionDone] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [showToneInfo, setShowToneInfo] = useState(false);

  const maxQuestionsParam = useMemo(() => {
    const raw = params.maxQuestions ?? "";
    const n = String(raw).trim() === "" ? null : Math.max(1, Number(raw));
    return n;
  }, [params.maxQuestions]);

  const [maxQ, setMaxQ] = useState<number | null>(maxQuestionsParam);
  useEffect(() => {
    setMaxQ(maxQuestionsParam);
  }, [maxQuestionsParam]);

  const totalQuestions = maxQ ?? filtered.length;

  const noRepeatHintType = params.noRepeatHintType === "1";

  // answer modes
  const pinyinMode = params.pinyinMode === "choice" ? "choice" : "input";
  const frMode = params.frMode === "choice" ? "choice" : "input";

  // answer element from settings (optional)
  const answerType = useMemo<AnswerMode | null>(() => {
    const a = params.answer;
    if (a === "hanzi" || a === "pinyin" || a === "translation") return a;
    return null;
  }, [params.answer]);

  // allowed hint types from settings (exclude answerType if provided)
  const allowedTypes: HintMode[] = useMemo(() => {
    const raw = (params.types ?? "hanzi,pinyin,translation").split(",").map(s => s.trim()).filter(Boolean);
    const valid = new Set<HintMode>(["hanzi", "pinyin", "translation"]);
    const arr = raw.filter((v): v is HintMode => valid.has(v as HintMode) && (!answerType || v !== answerType));
    const defaults = ["hanzi", "pinyin", "translation"].filter(t => !answerType || t !== answerType) as HintMode[];
    return arr.length ? arr : defaults;
  }, [params.types, answerType]);

  // load words & filter by series
  useEffect(() => {
    loadWordsLocalOnly()
      .then((all) => {
        let filteredList: Word[];
        if (!params.series || params.series === "all") filteredList = all;
        else {
          const set = new Set(params.series.split(",").map((s) => Number(s)));
          filteredList = all.filter((w) => set.has(w.series ?? -999));
        }
        if (filteredList.length < 5) {
          Alert.alert("Sélection insuffisante", "Il faut au moins 5 caractères dans la sélection.");
        }
        originalFilteredRef.current = filteredList;
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
    setSelectedId(null);
    setSelectedFrId(null);
    setSelectedPinyinId(null);
    setQuestionDone(false);
    setFeedback([]);
    setShowResult(false);
  }, [current, allowedTypes, noRepeatHintType, filtered]);

  // (no hints)

  // ===== VALIDATE =====
  function validate() {
    if (!current || questionDone) return;
    const messages: string[] = [];
    let correct = true;

    if (answerType) {
      if (answerType === "translation") {
        const frOK = frMode === "choice"
          ? selectedFrId === current.id
          : isFrenchAnswerCorrect(inputFR, current.fr);
        if (!frOK) {
          correct = false;
          messages.push(`Traduction attendue : "${formatFr(current.fr)}"`);
        }
      }

      if (answerType === "pinyin") {
        if (pinyinMode === "choice") {
          const pinOK = selectedPinyinId != null && acceptedIds.has(selectedPinyinId);
          if (!pinOK) {
            correct = false;
            messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
          }
        } else {
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
      }

      if (answerType === "hanzi") {
        const isAccepted = selectedId != null && acceptedIds.has(selectedId);
        if (!isAccepted) {
          correct = false;
          messages.push("Mauvais caractère choisi.");
        }
      }
    } else {
      if (hintType === "hanzi") {
        const frOK = frMode === "choice"
          ? selectedFrId === current.id
          : isFrenchAnswerCorrect(inputFR, current.fr);
        if (!frOK) {
          correct = false;
          messages.push(`Traduction attendue : "${formatFr(current.fr)}"`);
        }
        if (pinyinMode === "choice") {
          const pinOK = selectedPinyinId != null && acceptedIds.has(selectedPinyinId);
          if (!pinOK) {
            correct = false;
            messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
          }
        } else {
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
      }

      if (hintType === "pinyin") {
        const frOK = frMode === "choice"
          ? selectedFrId === current.id
          : isFrenchAnswerCorrect(inputFR, current.fr);
        if (!frOK) {
          correct = false;
          messages.push(`Traduction attendue : "${formatFr(current.fr)}"`);
        }
        const isAccepted = selectedId != null && acceptedIds.has(selectedId);
        if (!isAccepted) {
          correct = false;
          messages.push("Mauvais caractère choisi.");
        }
      }

      if (hintType === "translation") {
        if (pinyinMode === "choice") {
          const pinOK = selectedPinyinId != null && acceptedIds.has(selectedPinyinId);
          if (!pinOK) {
            correct = false;
            messages.push(`Pinyin attendu : "${current.pinyin}" (toléré en numérique : "${current.numeric}")`);
          }
        } else {
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
        const isAccepted = selectedId != null && acceptedIds.has(selectedId);
        if (!isAccepted) {
          correct = false;
          messages.push("Mauvais caractère choisi.");
        }
      }
    }

    // scoring
    const delta = correct ? 1 : 0;
    setScore((s) => s + delta);
    if (!correct) setWrongQuestions((w) => [...w, current]);

    // End of question state
    setQuestionDone(true);

    // Feedback lines + Bravo/Dommage + solution (list all accepted hanzi if multiple)
    const header = correct ? "Bravo !" : "Dommage !";
    const hanziSolutions =
      Array.from(acceptedIds)
        .map(id => filtered.find(w => w.id === id)?.hanzi || choices.find(w => w.id === id)?.hanzi || "")
        .filter(Boolean)
        .join(" / ") || current.hanzi;

    const solutionLine = `Solution — 汉字: ${hanziSolutions} · Pinyin: ${current.pinyin} · FR: ${formatFr(current.fr)}`;
    setFeedback([header, ...messages, solutionLine]);
    setShowResult(true);

    // Toast
    toast.show(correct ? "Bravo !" : "Dommage…", correct ? "success" : "error");
  }

  function goNext() {
    setShowResult(false);
    setQuestionDone(false);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalQuestions) {
      setGameOver(true);
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

  function restartGame() {
    setScore(0);
    setCurrentIndex(0);
    setWrongQuestions([]);
    setFiltered(originalFilteredRef.current);
    setShuffledCharacters(shuffle(originalFilteredRef.current));
    setMaxQ(maxQuestionsParam);
    setGameOver(false);
  }

  function replayErrorsOnly() {
    if (wrongQuestions.length === 0) return;
    setScore(0);
    setCurrentIndex(0);
    setFiltered(wrongQuestions);
    setShuffledCharacters(shuffle(wrongQuestions));
    setWrongQuestions([]);
    setMaxQ(wrongQuestions.length);
    setGameOver(false);
  }

  function ResultScreen() {
    const message = score / totalQuestions >= 0.8 ? "Bravo !" : "La prochaine fois ce sera mieux…";
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-start",
          backgroundColor: colors.background,
          padding: 20,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: tx(24), fontWeight: "700", color: colors.text }}>
          Score final : {score}/{totalQuestions}
        </Text>
        <Text style={{ fontSize: tx(18), color: colors.text }}>{message}</Text>
        <View style={{ alignSelf: "stretch", gap: 12 }}>
          {wrongQuestions.length > 0 && (
            <ZenButton
              title="Voir mes erreurs"
              onPress={() =>
                router.push({
                  pathname: "/module/1/errors",
                  params: { list: JSON.stringify(wrongQuestions) },
                })
              }
            />
          )}
          <ZenButton title="Rejouer" onPress={restartGame} />
          {wrongQuestions.length > 0 && (
            <ZenButton title="Rejouer mes erreurs" onPress={replayErrorsOnly} />
          )}
          <ZenButton title="Menu principal" onPress={() => router.push("/")} />
          <ZenButton
            title="Paramètres du module 1"
            onPress={() => router.push("/module/1/settings")}
          />
        </View>
      </View>
    );
  }

  if (gameOver) return <ResultScreen />;
  if (!current) return null;

  const isLastQuestion = currentIndex + 1 >= totalQuestions;
  const nextButtonTitle = isLastQuestion ? "Voir les résultats" : "Question suivante";

  const hintLabel = hintType === "hanzi" ? "汉字" : hintType === "pinyin" ? "Pinyin" : "Traduction FR";
  const hintText = hintType === "hanzi" ? current.hanzi : hintType === "pinyin" ? current.pinyin : formatFr(current.fr);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
      >
      {/* Header / hint type */}
      <View style={{ alignItems: "center", gap: 8 }}>
        <Text style={{ fontSize: tx(16), fontWeight: "700", color: colors.text }}>
          Question {currentIndex + 1}/{totalQuestions}
        </Text>
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

        {hintType === "translation" && current.frDetails && (
          <Text style={{ marginTop: 4, fontSize: tx(16), color: colors.muted }}>
            {current.frDetails}
          </Text>
        )}

        {hintType === "pinyin" && !questionDone && (
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
        )}

        <Text style={{ marginTop: 8, fontWeight: "700", color: colors.text }}>
          Score: {score}/{totalQuestions}
        </Text>
      </View>

  {/* FR block (FauxTextarea + input) */}
  {(answerType
    ? answerType === "translation"
    : hintType === "hanzi" || hintType === "pinyin") && (
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
          <FauxTextarea value={questionDone ? formatFr(current.fr) : ""} disabled={questionDone} placeholder="—" />
          {frMode === "input" ? (
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
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {choices.map((w) => {
                const selected = selectedFrId === w.id && !questionDone;
                const isSolution = questionDone && w.id === current.id;
                const baseStyle = {
                  width: "48%" as const,
                  borderRadius: 12,
                  borderWidth: 2,
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  backgroundColor: colors.background,
                };
                let borderColor = colors.border;
                if (selected) borderColor = colors.text;
                if (isSolution) borderColor = colors.accent;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => !questionDone && setSelectedFrId(w.id)}
                    disabled={questionDone}
                    style={[baseStyle, { borderColor }]}
                  >
                    <Text style={{ fontSize: tx(16), color: colors.text, textAlign: "center" }}>
                      {formatFr(w.fr)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

  {/* Pinyin block (FauxTextarea + input) */}
  {(answerType
    ? answerType === "pinyin"
    : hintType === "hanzi" || hintType === "translation") && (
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: tx(14), color: colors.muted }}>
              Pinyin (accents obligatoires; numérique toléré)
            </Text>
            <Pressable onPress={() => setShowToneInfo(true)}>
              <Ionicons name="information-circle-outline" size={tx(18)} color={colors.muted} />
            </Pressable>
          </View>
          <FauxTextarea value={questionDone ? current.pinyin : ""} disabled={questionDone} placeholder="—" />
          {pinyinMode === "input" ? (
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
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {choices.map((w) => {
                const selected = selectedPinyinId === w.id && !questionDone;
                const isSolution = questionDone && acceptedIds.has(w.id);
                const baseStyle = {
                  width: "48%" as const,
                  borderRadius: 12,
                  borderWidth: 2,
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  backgroundColor: colors.background,
                };
                let borderColor = colors.border;
                if (selected) borderColor = colors.text;
                if (isSolution) borderColor = colors.accent;
                return (
                  <Pressable
                    key={w.id}
                    onPress={() => !questionDone && setSelectedPinyinId(w.id)}
                    disabled={questionDone}
                    style={[baseStyle, { borderColor }]}
                  >
                    <Text style={{ fontSize: tx(16), color: colors.text, textAlign: "center" }}>
                      {w.pinyin}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

  {/* Choice tiles */}
  {(answerType
    ? answerType === "hanzi"
    : hintType === "pinyin" || hintType === "translation") && (
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
                borderWidth: 2,
                alignItems: "center" as const,
                justifyContent: "center" as const,
                backgroundColor: colors.background,
              };
              let borderColor = colors.border;
              if (selected) borderColor = colors.text;
              if (isSolution) borderColor = colors.accent;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => !questionDone && setSelectedId(w.id)}
                  disabled={questionDone}
                  style={[baseStyle, { borderColor }]}
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
          <ZenButton title="Valider" onPress={validate} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <ZenButton title="Solution" onPress={() => setShowResult(true)} />
          <ZenButton title={nextButtonTitle} onPress={goNext} />
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    {showToneInfo && (
      <Pressable
        onPress={() => setShowToneInfo(false)}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            width: "80%",
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => setShowToneInfo(false)}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            <Text style={{ fontSize: tx(18), color: colors.text }}>✕</Text>
          </Pressable>
          <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>
            Accents numériques
          </Text>
          <Text style={{ fontSize: tx(14), color: colors.text }}>
            Les chiffres 1 à 4 après la syllabe indiquent le ton correspondant. Exemple :
            ni3 → nǐ. L’absence de chiffre ou 5 correspond au ton neutre.
          </Text>
        </Pressable>
      </Pressable>
    )}

    {showResult && (
      <Pressable
        onPress={() => setShowResult(false)}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            width: "80%",
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => setShowResult(false)}
            style={{ position: "absolute", top: 8, right: 8 }}
          >
            <Text style={{ fontSize: tx(18), color: colors.text }}>✕</Text>
          </Pressable>
          {feedback.map((m, i) => (
            <Text key={i} style={{ fontSize: tx(14), color: colors.text }}>
              • {m}
            </Text>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8 }}>
            <Pressable
              onPress={onPressAudio}
              disabled={audioDisabled}
              style={[
                {
                  backgroundColor: colors.background,
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
            <ZenButton title={nextButtonTitle} onPress={goNext} />
          </View>
        </Pressable>
      </Pressable>
    )}
  </View>
  );
}
