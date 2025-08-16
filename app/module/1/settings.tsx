import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";

type SeriesOption = { value: number | "all"; label: string };

export default function Module1Settings() {
  const router = useRouter();
  const [words, setWords] = useState<Word[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Array<number> | "all">("all");
  const [maxQuestions, setMaxQuestions] = useState<number | null>(20);
  const [noRepeatHintType, setNoRepeatHintType] = useState<boolean>(true);

  // NEW: question types allowed
  const [allowHanzi, setAllowHanzi] = useState(true);
  const [allowPinyin, setAllowPinyin] = useState(true);
  const [allowTranslation, setAllowTranslation] = useState(true);

  useEffect(() => {
    loadWordsLocalOnly().then(setWords).catch(() => Alert.alert("Erreur", "Impossible de charger les mots."));
  }, []);

  const series = useMemo<SeriesOption[]>(() => {
    const set = new Set<number>();
    words.forEach(w => { if (typeof w.series === "number") set.add(w.series); });
    const arr = Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, label: `Série ${n}` }));
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
    // Validate series selection count >= 5 characters
    const filtered =
      selectedSeries === "all" ? words : words.filter(w => selectedSeries.includes(w.series ?? -1));
    if (filtered.length < 5) {
      Alert.alert("Sélection insuffisante", "Il faut au moins 5 caractères dans la sélection.");
      return;
    }

    // Validate at least one type selected
    const types: string[] = [];
    if (allowHanzi) types.push("hanzi");
    if (allowPinyin) types.push("pinyin");
    if (allowTranslation) types.push("translation");
    if (types.length === 0) {
      Alert.alert("Types de questions", "Sélectionne au moins un type de question.");
      return;
    }

    router.push({
      pathname: "/module/1",
      params: {
        series: selectedSeries === "all" ? "all" : selectedSeries.join(","),
        maxQuestions: maxQuestions ?? "",
        noRepeatHintType: noRepeatHintType ? "1" : "0",
        types: types.join(","), // NEW
      },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paramètres de la partie</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Séries de caractères chinois</Text>
        {series.map(opt => {
          const checked =
            opt.value === "all"
              ? selectedSeries === "all"
              : selectedSeries !== "all" && selectedSeries.includes(opt.value as number);
          return (
            <Pressable key={String(opt.value)} onPress={() => toggleSeries(opt)} style={styles.row}>
              <View style={[styles.checkbox, checked && styles.checkboxOn]} />
              <Text style={styles.label}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Nombre maximal de questions</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="ex: 20 (laisser vide pour illimité)"
          style={styles.input}
          value={maxQuestions === null ? "" : String(maxQuestions)}
          onChangeText={(t) => {
            const v = t.trim() === "" ? null : Math.max(1, Math.min(200, Number(t.replace(/[^0-9]/g, ""))));
            setMaxQuestions(v);
          }}
        />
        <Text style={styles.hint}>Laisser vide pour “illimité”. Plage conseillée : 5–200.</Text>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.section}>Éviter deux fois d’affilée le même type d’indice</Text>
        <Switch value={noRepeatHintType} onValueChange={setNoRepeatHintType} />
      </View>

      {/* NEW: allowed question types */}
      <View style={styles.card}>
        <Text style={styles.section}>Types de questions autorisés</Text>
        <Pressable onPress={() => setAllowHanzi(v => !v)} style={styles.row}>
          <View style={[styles.checkbox, allowHanzi && styles.checkboxOn]} />
          <Text style={styles.label}>汉字 uniquement (question Hanzi)</Text>
        </Pressable>
        <Pressable onPress={() => setAllowPinyin(v => !v)} style={styles.row}>
          <View style={[styles.checkbox, allowPinyin && styles.checkboxOn]} />
          <Text style={styles.label}>Pinyin</Text>
        </Pressable>
        <Pressable onPress={() => setAllowTranslation(v => !v)} style={styles.row}>
          <View style={[styles.checkbox, allowTranslation && styles.checkboxOn]} />
          <Text style={styles.label}>Traduction FR</Text>
        </Pressable>
        <Text style={styles.hint}>Par défaut : les trois activés.</Text>
      </View>

      <Pressable onPress={startGame} style={styles.cta}>
        <Text style={styles.ctaText}>Démarrer la partie</Text>
      </Pressable>

      <Link href="/" asChild>
        <Pressable style={styles.linkBack}><Text style={styles.linkText}>← Retour menu</Text></Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 8, elevation: 2 },
  cardRow: { backgroundColor: "#fff", borderRadius: 12, padding: 12, gap: 8, elevation: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: "#ccc" },
  checkboxOn: { backgroundColor: "#111", borderColor: "#111" },
  label: { fontSize: 15 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16 },
  hint: { fontSize: 12, color: "#666", marginTop: 6 },
  cta: { backgroundColor: "#111", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  linkBack: { paddingVertical: 10, alignItems: "center" },
  linkText: { color: "#333", textDecorationLine: "underline" },
});
