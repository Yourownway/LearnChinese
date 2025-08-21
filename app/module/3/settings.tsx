import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ZenButton } from "../../../components/ZenButton";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";

interface SeriesOption { value: number | "all"; label: string }

export default function Module3Settings() {
  const router = useRouter();
  const { colors, tx } = useTheme();

  const [words, setWords] = useState<Word[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<number[] | "all">("all");
  const [maxQuestions, setMaxQuestions] = useState<number | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showHintAfterMisses, setShowHintAfterMisses] = useState(3);
  const [scoreMode, setScoreMode] = useState(false);
  const [maxHints, setMaxHints] = useState(3);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  useEffect(() => {
    loadWordsLocalOnly()
      .then(setWords)
      .catch(() => Alert.alert("Erreur", "Impossible de charger les mots."));
  }, []);

  const series = useMemo<SeriesOption[]>(() => {
    const set = new Set<number>();
    words.forEach(w => typeof w.series === "number" && set.add(w.series));
    const arr = Array.from(set).sort((a,b) => a-b).map(n => ({ value: n, label: `Série ${n}` }));
    return [{ value: "all", label: "Toutes les séries" }, ...arr];
  }, [words]);

  const filteredWords = useMemo(() => {
    return selectedSeries === "all"
      ? words
      : words.filter(w => selectedSeries.includes(w.series ?? -1));
  }, [words, selectedSeries]);

  useEffect(() => {
    setMaxQuestions(filteredWords.length);
  }, [filteredWords.length]);

  function toggleSeries(opt: SeriesOption) {
    if (opt.value === "all") { setSelectedSeries("all"); return; }
    if (selectedSeries === "all") setSelectedSeries([opt.value as number]);
    else {
      const set = new Set(selectedSeries);
      if (set.has(opt.value as number)) set.delete(opt.value as number); else set.add(opt.value as number);
      const arr = Array.from(set).sort((a,b) => a-b);
      setSelectedSeries(arr.length ? arr : "all");
    }
  }

  function togglePinyin() {
    setShowPinyin((p) => (p && !showTranslation ? true : !p));
  }

  function toggleTranslation() {
    setShowTranslation((t) => (t && !showPinyin ? true : !t));
  }

  function startGame() {
    if (filteredWords.length === 0) {
      Alert.alert("Sélection insuffisante", "Choisis au moins une série.");
      return;
    }
    const max = maxQuestions ?? filteredWords.length;
    const pinyin = showPinyin || !showTranslation;
    const translation = showTranslation || !showPinyin;
    const params = {
      series: selectedSeries === "all" ? "all" : selectedSeries.join(","),
      maxQuestions: String(max),
      showOutline: showOutline ? "1" : "0",
      showHintAfterMisses: String(showHintAfterMisses),
      scoreMode: scoreMode ? "1" : "0",
      maxHints: String(maxHints),
      showPinyin: pinyin ? "1" : "0",
      showTranslation: translation ? "1" : "0",
    };
    router.push({ pathname: "/module/3", params });
  }

  return (
    <ScrollView
      style={{ flex:1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding:20, gap:16 }}
    >
      <Text style={{ fontSize: tx(20), fontWeight: "700", color: colors.text }}>
        Paramètres de la partie
      </Text>

      <View style={{ backgroundColor: colors.card, borderRadius:12, padding:12, gap:8, borderWidth:1, borderColor: colors.border }}>
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>Séries</Text>
        {series.map(opt => {
          const selected = selectedSeries === "all" ? opt.value === "all" : opt.value !== "all" && selectedSeries.includes(opt.value as number);
          return (
            <Pressable key={String(opt.value)} onPress={() => toggleSeries(opt)} style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6 }}>
              <View style={{ width:20, height:20, borderRadius:4, borderWidth:2, borderColor: colors.border, backgroundColor: selected ? colors.accent : "transparent" }} />
              <Text style={{ fontSize: tx(15), color: colors.text }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius:12, padding:12, gap:8, borderWidth:1, borderColor: colors.border }}>
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>Nombre max de questions</Text>
        <TextInput
          keyboardType="numeric"
          value={maxQuestions?.toString() ?? ""}
          onChangeText={t => setMaxQuestions(t ? Number(t) : null)}
          style={{ backgroundColor: colors.background, paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor: colors.border, color: colors.text }}
        />
        <Text style={{ fontSize: tx(12), color: colors.muted }}>Max : {filteredWords.length}</Text>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius:12, padding:12, gap:8, borderWidth:1, borderColor: colors.border }}>
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>Affichage</Text>
        <Pressable onPress={togglePinyin} style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6 }}>
          <View style={{ width:20, height:20, borderRadius:4, borderWidth:2, borderColor: colors.border, backgroundColor: showPinyin ? colors.accent : "transparent" }} />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Afficher le pinyin</Text>
        </Pressable>
        <Pressable onPress={toggleTranslation} style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6 }}>
          <View style={{ width:20, height:20, borderRadius:4, borderWidth:2, borderColor: colors.border, backgroundColor: showTranslation ? colors.accent : "transparent" }} />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Afficher la traduction</Text>
        </Pressable>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius:12, padding:12, gap:8, borderWidth:1, borderColor: colors.border }}>
        <Text style={{ fontSize: tx(16), fontWeight: "600", color: colors.text }}>Options Hanzi Writer</Text>
        <Pressable
          onPress={scoreMode ? undefined : () => setShowOutline(o => !o)}
          style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6, opacity: scoreMode ? 0.5 : 1 }}
        >
          <View style={{ width:20, height:20, borderRadius:4, borderWidth:2, borderColor: colors.border, backgroundColor: showOutline ? colors.accent : "transparent" }} />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Afficher le caractère</Text>
        </Pressable>
        <View style={{ gap:4 }}>
          <Text style={{ fontSize: tx(15), color: colors.text }}>Indice après erreurs</Text>
          <TextInput
            keyboardType="numeric"
            value={showHintAfterMisses.toString()}
            onChangeText={t => setShowHintAfterMisses(t ? Number(t) : 0)}
            style={{ backgroundColor: colors.background, paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor: colors.border, color: colors.text }}
          />
        </View>
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius:12, padding:12, gap:8, borderWidth:1, borderColor: colors.border }}>
        <Pressable
          onPress={() =>
            setScoreMode(m => {
              const next = !m;
              if (next) setShowOutline(false);
              return next;
            })
          }
          style={{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:6 }}
        >
          <View style={{ width:20, height:20, borderRadius:4, borderWidth:2, borderColor: colors.border, backgroundColor: scoreMode ? colors.accent : "transparent" }} />
          <Text style={{ fontSize: tx(15), color: colors.text }}>Mode score</Text>
        </Pressable>
        {scoreMode && (
          <View style={{ gap:4 }}>
            <Text style={{ fontSize: tx(15), color: colors.text }}>Indices max avant échec</Text>
            <TextInput
              keyboardType="numeric"
              value={maxHints.toString()}
              onChangeText={t => setMaxHints(t ? Number(t) : 0)}
              style={{ backgroundColor: colors.background, paddingHorizontal:12, paddingVertical:6, borderRadius:8, borderWidth:1, borderColor: colors.border, color: colors.text }}
            />
          </View>
        )}
      </View>

      <ZenButton title="Démarrer la partie" onPress={startGame} />

      <Link href="/" asChild>
        <Pressable style={{ paddingVertical:10, alignItems:"center" }}>
          <Text style={{ color: colors.muted, fontSize: tx(14) }}>← Retour menu</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
