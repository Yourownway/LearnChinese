import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { HanziWriterQuiz } from "../../../components/HanziWriterQuiz";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";
import { shuffle } from "../../../lib/utils";

type Params = {
  series?: string;
  maxQuestions?: string;
};

export default function Module3Game() {
  const { colors, tx } = useTheme();
  const params = useLocalSearchParams<Params>();
  const router = useRouter();

  const [words, setWords] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

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

  function handleComplete() {
    setCompleted(true);
  }

  function next() {
    if (index + 1 >= words.length) {
      router.replace("/module/3/settings");
    } else {
      setIndex((i) => i + 1);
      setCompleted(false);
    }
  }

  if (!current) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, fontSize: tx(16) }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
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
        <HanziWriterQuiz char={current.hanzi} onComplete={handleComplete} />
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>{current.pinyin}</Text>
        <Text style={{ color: colors.text, fontSize: tx(16), textAlign: "center" }}>{current.fr}</Text>
        {current.frDetails && (
          <Text style={{ color: colors.text, fontSize: tx(14), textAlign: "center" }}>{current.frDetails}</Text>
        )}
      </View>
      {completed && (
        <View style={{ marginTop: 12 }}>
          <ZenButton title={index + 1 >= words.length ? "Terminer" : "Suivant"} onPress={next} />
        </View>
      )}
    </View>
  );
}
