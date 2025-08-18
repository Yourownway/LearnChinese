import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";

export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tx } = useTheme();
  const [word, setWord] = useState<Word | null>(null);

  useEffect(() => {
    loadWordsLocalOnly()
      .then((all) => setWord(all.find((w) => w.id === id) || null))
      .catch(() => setWord(null));
  }, [id]);

  if (!word) return null;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 20,
      }}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          alignItems: "center",
          gap: 12,
        }}
      >
        <Text style={{ fontSize: tx(64), color: colors.text, fontWeight: "700" }}>
          {word.hanzi}
        </Text>
        <Text style={{ fontSize: tx(24), color: colors.text }}>{word.pinyin}</Text>
        <Text style={{ fontSize: tx(20), color: colors.text }}>{word.fr}</Text>
      </View>
    </View>
  );
}
