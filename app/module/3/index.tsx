import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  HanziWriterQuiz,
  type HanziWriterQuizHandle,
} from "../../../components/HanziWriterQuiz";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";
import { shuffle } from "../../../lib/utils";

type Params = {
  series?: string;
  maxQuestions?: string;
  showOutline?: string;
  showHintAfterMisses?: string;
  scoreMode?: string;
  maxHints?: string;
  showPinyin?: string;
  showTranslation?: string;
};

export default function Module3Game() {
  const { colors, tx } = useTheme();
  const params = useLocalSearchParams<Params>();
  const router = useRouter();

  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [success, setSuccess] = useState<boolean | null>(null);
  const questionLost = useRef(false);
  const quizRef = useRef<HanziWriterQuizHandle>(null);

  useEffect(() => {
    loadWordsLocalOnly()
      .then((all) => {
        let filtered = all;
        if (params.series && params.series !== "all") {
          const set = new Set(params.series.split(",").map((s) => Number(s)));
          filtered = all.filter((w) => set.has(w.series ?? -1));
        }
        if (filtered.length === 0) {
          Alert.alert("Sélection vide", "Aucun caractère trouvé.");
        }
        const max = params.maxQuestions ? Math.min(filtered.length, Number(params.maxQuestions)) : filtered.length;
        const list = shuffle(filtered).slice(0, max);
        setWords(list);
      })
      .catch(() => Alert.alert("Erreur", "Impossible de charger les mots."));
  }, [params.series, params.maxQuestions]);

  const current = words[index];

  const showOutline = params.showOutline !== "0";
  const showHintAfterMisses = params.showHintAfterMisses ? Number(params.showHintAfterMisses) : 3;
  const scoreMode = params.scoreMode === "1";
  const maxHints = params.maxHints ? Number(params.maxHints) : 3;
  const showPinyin = params.showPinyin !== "0";
  const showTranslation = params.showTranslation !== "0";
  const displayPinyin = showPinyin || !showTranslation;
  const displayTranslation = showTranslation || !showPinyin;

  function handleComplete() {
    if (scoreMode && !questionLost.current) {
      setScore((s) => s + 1);
    }
    questionLost.current = false;
    setCompleted(true);
    setSuccess(true);
  }

  function handleFail() {
    if (scoreMode) {
      questionLost.current = true;
      setCompleted(true);
      setSuccess(false);
    }
  }

  function showSolution() {
    if (!completed) {
      questionLost.current = true;
      setCompleted(true);
      setSuccess(false);
    }
    quizRef.current?.showSolution();
  }

  function restart() {
    questionLost.current = false;
    setCompleted(false);
    setSuccess(null);
    quizRef.current?.restart();
  }

  function next() {
    if (!completed) return;
    if (index + 1 >= words.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setCompleted(false);
      setSuccess(null);
      questionLost.current = false;
    }
  }

  if (!current && !finished) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontSize: tx(16) }}>Chargement...</Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 20 }}>
        <Text
          style={{
            fontSize: tx(20),
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Partie terminée !
        </Text>
        {scoreMode && (
          <Text style={{ fontSize: tx(16), color: colors.text, marginBottom: 20 }}>{`Score : ${score}/${words.length}`}</Text>
        )}
        <ZenButton title="Retour aux paramètres" onPress={() => router.replace("/module/3/settings")} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      {scoreMode && (
        <Text
          style={{
            fontSize: tx(16),
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          {`Score : ${score}/${words.length}`}
        </Text>
      )}
      <Text
        style={{
          fontSize: tx(16),
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        Question {index + 1}/{words.length}
      </Text>
      <Text
        style={{
          fontSize: tx(18),
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        Écris le caractère
      </Text>
      <View style={{ flex: 1 }}>
        <HanziWriterQuiz
          ref={quizRef}
          char={current.hanzi}
          showOutline={showOutline}
          showHintAfterMisses={showHintAfterMisses}
          maxMistakes={scoreMode ? maxHints : undefined}
          onComplete={handleComplete}
          onFail={handleFail}
        />
      </View>
      <View style={{ marginTop: 12 }}>
        {displayPinyin && (
          <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>{current.pinyin}</Text>
        )}
        {displayTranslation && (
          <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>{current.fr}</Text>
        )}
        {displayTranslation && current.frDetails && (
          <Text style={{ color: colors.text, fontSize: tx(14), textAlign: "center" }}>{current.frDetails}</Text>
        )}
      </View>
      <View style={{ marginTop: 12 }}>
        {completed && (
          <Text
            style={{
              color: colors.text,
              fontSize: tx(16),
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {success ? "Bravo !" : "Dommage"}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
          <ZenButton title="Solution" onPress={showSolution} />
          {!scoreMode && <ZenButton title="Recommencer" onPress={restart} />}
          <ZenButton
            title={index + 1 >= words.length ? "Terminer" : "Question suivante"}
            onPress={next}
            disabled={!completed}
          />
        </View>
      </View>
    </View>
  );
}
