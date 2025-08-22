import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

const PROVERBS = [
  { hanzi: "学而不思则罔", pinyin: "xué ér bù sī zé wǎng", fr: "Étudier sans réfléchir est vain." },
  { hanzi: "不积跬步，无以至千里", pinyin: "bù jī kuǐ bù, wú yǐ zhì qiān lǐ", fr: "Sans petits pas, pas de mille lieues." },
  { hanzi: "温故而知新", pinyin: "wēn gù ér zhī xīn", fr: "Réviser l'ancien pour apprendre du nouveau." },
];

export const ProverbCard: React.FC = () => {
  const { colors, tx } = useTheme();
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(Math.floor(Math.random() * PROVERBS.length));
  }, []);

  const p = PROVERBS[i];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.hanzi, { color: colors.text, fontSize: tx(24) }]}>{p.hanzi}</Text>
      <Text style={[styles.pinyin, { color: colors.muted, fontSize: tx(14) }]}>{p.pinyin}</Text>
      <Text style={[styles.fr, { color: colors.text, fontSize: tx(14) }]}>{p.fr}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  hanzi: { fontWeight: "800", textAlign: "center", fontFamily: "NotoSerifSC" },
  pinyin: { textAlign: "center" },
  fr: { textAlign: "center" },
});
