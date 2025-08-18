import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";

import { StrokeAnimator } from "@/components/StrokeAnimator";
import { useTheme } from "@/hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "@/lib/data";

export default function Module2Writing() {
  const { colors, tx } = useTheme();
  const [word, setWord] = useState<Word | null>(null);

  useEffect(() => {
    loadWordsLocalOnly().then((w) => setWord(w[0]));
  }, []);

  if (!word) return null;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
        gap: 20,
      }}
    >
      <StrokeAnimator hanzi={word.hanzi} size={200} strokeColor={colors.text} />
      <Text style={{ fontSize: tx(32), color: colors.text }}>{word.hanzi}</Text>
      <Text style={{ fontSize: tx(18), color: colors.muted }}>{word.fr}</Text>
    </View>
  );
}
