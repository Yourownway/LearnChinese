import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";

type SeriesOption = { value: number | "all"; label: string };

export default function Module1Settings() {
  const router = useRouter();
  const { colors, tx } = useTheme();

  const [words, setWords] = useState<Word[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<number[] | "all">("all");
  const [maxQuestions, setMaxQuestions] = useState<number | null>(null);
  const [noRepeatHintType, setNoRepeatHintType] = useState<boolean>(true);

  // NEW: question types allowed
  const [allowHanzi, setAllowHanzi] = useState(true);
  const [allowPinyin, setAllowPinyin] = useState(true);
  const [allowTranslation, setAllowTranslation] = useState(true);

  const activeTypeCount = [allowHanzi, allowPinyin, allowTranslation].filter(Boolean).length;

  const filteredWords = useMemo(() => {
    return selectedSeries === "all"
      ? words
      : words.filter((w) => selectedSeries.includes(w.series ?? -1));
  }, [words, selectedSeries]);

  useEffect(() => {
    setMaxQuestions(filteredWords.length);
  }, [filteredWords.length]);

  useEffect(() => {
    loadWordsLocalOnly()
      .then(setWords)
      .catch(() => Alert.alert("Erreur", "Impossible de charger les mots."));
  }, []);

  const series = useMemo<SeriesOption[]>(() => {
    const set = new Set<number>();
    words.forEach((w) => {
      if (typeof w.series === "number") set.add(w.series);
    });
    const arr = Array.from(set)
      .sort((a, b) => a - b)
      .map((n) => ({ value: n, label: `Série ${n}` }));
    return [{ value: "all", label: "Toutes les séries" }, ...arr];
  }, [words]);

  function toggleSeries(opt: SeriesOption) {
    if (opt.value === "all") {
      setSelectedSeries("all");
      return;
    }
    if (selectedSeries === "all") {
      setSelectedSeries([opt.value as number]);
    } else {
      const set = new Set(selectedSeries);
      if (set.has(opt.value as number)) set.delete(opt.value as number);
      else set.add(opt.value as number);
      const next = Array.from(set).sort((a, b) => a - b);
      setSelectedSeries(next.length === 0 ? "all" : next);
    }
  }

  function startGame() {
    if (filteredWords.length < 5) {
      Alert.alert("Sélection insuffisante", "Il faut au moins 5 caractères dans la sélection.");
      return;
    }

    const types: string[] = [];
    if (allowHanzi) types.push("hanzi");
    if (allowPinyin) types.push("pinyin");
    if (allowTranslation) types.push("translation");
    if (types.length < 2) {
      Alert.alert("Types de questions", "Sélectionne au moins deux types de question.");
      return;
    }

    const max = maxQuestions ?? filteredWords.length;
    router.push({
      pathname: "/module/1",
      params: {
        series: selectedSeries === "all" ? "all" : selectedSeries.join(","),
        maxQuestions: String(max),
        noRepeatHintType: noRepeatHintType ? "1" : "0",
        types: types.join(","),
      },
    });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text style={{ fontSize: tx(20), fontWeight: "700", color: colors.text }}>
        Paramètres de la partie
      </Text>

      {/* Séries */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>
          Séries de caractères chinois
        </Text>
        {series.map((opt) => {
          const checked =
            opt.value === "all"
              ? selectedSeries === "all"
              : selectedSeries !== "all" && selectedSeries.includes(opt.value as number);
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => toggleSeries(opt)}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: colors.border,
                  backgroundColor: checked ? colors.accent : "transparent",
                }}
              />
              <Text style={{ fontSize: tx(15), color: colors.text }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Nombre max questions */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>
          Nombre maximal de questions
        </Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="Laisser vide pour tout"
          placeholderTextColor={colors.muted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            fontSize: tx(16),
            color: colors.text,
          }}
          value={maxQuestions === null ? "" : String(maxQuestions)}
          onChangeText={(t) => {
            const count = filteredWords.length;
            const v =
              t.trim() === ""
                ? null
                : Math.max(1, Math.min(count, Number(t.replace(/[^0-9]/g, ""))));
            setMaxQuestions(v);
          }}
        />
        <Text style={{ fontSize: tx(12), color: colors.muted }}>
          {`Laisser vide pour utiliser tous les caractères sélectionnés (max : ${filteredWords.length}).`}
        </Text>
      </View>

      {/* Switch no repeat */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>
          Éviter deux fois d’affilée le même type d’indice
        </Text>
        <Switch value={noRepeatHintType} onValueChange={setNoRepeatHintType} />
      </View>

      {/* Types de questions */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 12,
          padding: 12,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>
          Types de questions autorisés
        </Text>
        <Pressable
          onPress={() => {
            if (allowHanzi && activeTypeCount <= 2) {
              Alert.alert("Types de questions", "Sélectionne au moins deux types de question.");
              return;
            }
            setAllowHanzi((v) => !v);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: allowHanzi ? colors.accent : "transparent",
            }}
          />
          <Text style={{ fontSize: tx(15), color: colors.text }}>汉字 uniquement</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (allowPinyin && activeTypeCount <= 2) {
              Alert.alert("Types de questions", "Sélectionne au moins deux types de question.");
              return;
            }
            setAllowPinyin((v) => !v);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: allowPinyin ? colors.accent : "transparent",
            }}
          />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Pinyin</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            if (allowTranslation && activeTypeCount <= 2) {
              Alert.alert("Types de questions", "Sélectionne au moins deux types de question.");
              return;
            }
            setAllowTranslation((v) => !v);
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: colors.border,
              backgroundColor: allowTranslation ? colors.accent : "transparent",
            }}
          />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Traduction FR</Text>
        </Pressable>
        <Text style={{ fontSize: tx(12), color: colors.muted }}>
          Par défaut : les trois activés (minimum deux).
        </Text>
      </View>

      {/* CTA */}
      <ZenButton title="Démarrer la partie" onPress={startGame} />

      <Link href="/" asChild>
        <Pressable style={{ paddingVertical: 10, alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: tx(14) }}>← Retour menu</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
