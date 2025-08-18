import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { type Word } from "../../../lib/data";
import { formatFr } from "../../../lib/utils";

export default function ErrorListScreen() {
  const { colors, tx } = useTheme();
  const router = useRouter();
  const { list } = useLocalSearchParams<{ list?: string }>();

  const wrong: Word[] = useMemo(() => {
    try {
      return list ? (JSON.parse(list) as Word[]) : [];
    } catch {
      return [];
    }
  }, [list]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 20 }}
    >
      <Text style={{ fontSize: tx(24), fontWeight: "700", color: colors.text }}>
        Mes erreurs
      </Text>
      <View style={{ gap: 12 }}>
        {wrong.map((w) => (
          <View
            key={w.id}
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: tx(24), fontWeight: "800", color: colors.text }}>
              {w.hanzi}
            </Text>
            <Text style={{ fontSize: tx(16), color: colors.text }}>
              {w.pinyin} · {formatFr(w.fr)}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 10 }}>
        <ZenButton title="Retour" onPress={() => router.back()} />
      </View>
    </ScrollView>
  );
}
