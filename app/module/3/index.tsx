import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
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
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const questionLost = useRef(false);
  const quizRef = useRef<HanziWriterQuizHandle>(null);
  const originalWordsRef = useRef<Word[]>([]);

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
        originalWordsRef.current = list;
        setWords(list);
        setIndex(0);
        setScore(0);
        setFinished(false);
        setCompleted(false);
        setWrongWords([]);
        questionLost.current = false;
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

  function handleComplete() {
    if (scoreMode && !questionLost.current) {
      setScore((s) => s + 1);
    }
    questionLost.current = false;
    setCompleted(true);
  }

  function handleFail() {
    if (scoreMode) {
      questionLost.current = true;
      setCompleted(true);
    }
  }

  function showSolution() {
    quizRef.current?.showSolution();
    questionLost.current = true;
    setCompleted(true);
  }

  function restart() {
    quizRef.current?.restart();
    questionLost.current = false;
    setCompleted(false);
  }

  function next() {
    if (questionLost.current && current) {
      setWrongWords((arr) => [...arr, current]);
    }
    if (index + 1 >= words.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setCompleted(false);
      questionLost.current = false;
    }
  }

  function restartGame() {
    setScore(0);
    setIndex(0);
    setWords(shuffle(originalWordsRef.current));
    setFinished(false);
    setCompleted(false);
    questionLost.current = false;
    setWrongWords([]);
  }

  function replayErrorsOnly() {
    if (wrongWords.length === 0) return;
    setScore(0);
    setIndex(0);
    setWords(shuffle(wrongWords));
    setFinished(false);
    setCompleted(false);
    questionLost.current = false;
    setWrongWords([]);
  }

  if (!current && !finished) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontSize: tx(16) }}>Chargement...</Text>
      </View>
    );
  }

  if (finished) {
    if (scoreMode) {
      const message = score / words.length >= 0.8 ? "Bravo !" : "La prochaine fois ce sera mieux…";
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
            Score final : {score}/{words.length}
          </Text>
          <Text style={{ fontSize: tx(18), color: colors.text }}>{message}</Text>
          <View style={{ alignSelf: "stretch", gap: 12 }}>
            {wrongWords.length > 0 && (
              <ZenButton
                title="Voir mes erreurs"
                onPress={() =>
                  router.push({
                    pathname: "/module/3/errors",
                    params: { list: JSON.stringify(wrongWords) },
                  })
                }
              />
            )}
            <ZenButton title="Rejouer" onPress={restartGame} />
            {wrongWords.length > 0 && (
              <ZenButton title="Rejouer mes erreurs" onPress={replayErrorsOnly} />
            )}
            <ZenButton title="Menu principal" onPress={() => router.push("/")} />
            <ZenButton title="Nouvelle partie" onPress={() => router.push("/module/3/settings")} />
          </View>
        </View>
      );
    }
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
        <Text style={{ fontSize: tx(20), fontWeight: "700", color: colors.text }}>
          Partie terminée !
        </Text>
        <View style={{ alignSelf: "stretch", gap: 12 }}>
          <ZenButton title="Rejouer" onPress={restartGame} />
          <ZenButton title="Nouvelle partie" onPress={() => router.push("/module/3/settings")} />
          <ZenButton title="Menu principal" onPress={() => router.push("/")} />
        </View>
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
      <View style={{ marginBottom: 10 }}>
        <Text
          style={{
            fontSize: tx(18),
            fontWeight: "700",
            color: colors.text,
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Écris le caractère
        </Text>
        {showPinyin && (
          <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>
            {current.pinyin}
          </Text>
        )}
        {showPinyin && current.pinyinDetails && (
          <Text style={{ color: colors.text, fontSize: tx(14), textAlign: "center" }}>
            {current.pinyinDetails}
          </Text>
        )}
        {showTranslation && (
          <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>
            {current.fr}
          </Text>
        )}
        {showTranslation && current.frDetails && (
          <Text style={{ color: colors.text, fontSize: tx(14), textAlign: "center" }}>
            {current.frDetails}
          </Text>
        )}
      </View>
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
      {completed && (
        <Text
          style={{
            textAlign: "center",
            color: questionLost.current ? colors.text : colors.accent,
            fontSize: tx(16),
            marginTop: 12,
            marginBottom: 8,
          }}
        >
          {questionLost.current ? "Dommage..." : "Bravo !"}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <Pressable
          onPress={showSolution}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          <Text style={{ color: colors.text, fontSize: tx(14) }}>Solution</Text>
        </Pressable>
        {!scoreMode && (
          <Pressable
            onPress={restart}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Text style={{ color: colors.text, fontSize: tx(14) }}>Recommencer</Text>
          </Pressable>
        )}
      </View>
      <View style={{ marginTop: 12 }}>
        <ZenButton
          title={index + 1 >= words.length ? "Terminer" : "Question suivante"}
          onPress={next}
          disabled={!completed}
        />
      </View>
    </View>
  );
}
