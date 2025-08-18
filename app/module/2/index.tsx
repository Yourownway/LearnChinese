import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";

// Display preference for cards
const DISPLAY_OPTIONS = ["hanzi", "fr", "pinyin"] as const;
type DisplayPref = typeof DISPLAY_OPTIONS[number];

// Number of columns (cards per row)
const COLUMN_OPTIONS = [2, 3, 4, 5, 6] as const;
type ColumnCount = typeof COLUMN_OPTIONS[number];

type SortOrder = "asc" | "desc";

type SeriesSelection = number[] | "all";

export default function Module2Dictionary() {
  const { colors, tx } = useTheme();
  const router = useRouter();

  const [words, setWords] = useState<Word[]>([]);
  const [displayPref, setDisplayPref] = useState<DisplayPref>("hanzi");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedSeries, setSelectedSeries] = useState<SeriesSelection>("all");
  const [columns, setColumns] = useState<ColumnCount>(4);

  // Load words once
  useEffect(() => {
    loadWordsLocalOnly().then(setWords).catch(() => {});
  }, []);

  // Unique series numbers
  const seriesOptions = useMemo(() => {
    const set = new Set<number>();
    words.forEach((w) => {
      if (typeof w.series === "number") set.add(w.series);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [words]);

  const filtered = useMemo(() => {
    return selectedSeries === "all"
      ? words
      : words.filter((w) => selectedSeries.includes(w.series ?? -1));
  }, [words, selectedSeries]);

  const sorted = useMemo(() => {
    const key = displayPref === "hanzi" ? "hanzi" : displayPref === "fr" ? "fr" : "pinyin";
    return [...filtered].sort((a, b) => {
      const aVal = (a as any)[key] as string;
      const bVal = (b as any)[key] as string;
      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [filtered, displayPref, sortOrder]);

  const displayOrder = useMemo(() => {
    if (displayPref === "hanzi") return ["hanzi", "pinyin", "fr"] as const;
    if (displayPref === "fr") return ["fr", "pinyin", "hanzi"] as const;
    return ["pinyin", "hanzi", "fr"] as const;
  }, [displayPref]);

  function toggleSeries(n: number | "all") {
    if (n === "all") {
      setSelectedSeries("all");
      return;
    }
    if (selectedSeries === "all") {
      setSelectedSeries([n]);
    } else {
      const set = new Set(selectedSeries);
      if (set.has(n)) set.delete(n);
      else set.add(n);
      const arr = Array.from(set).sort((a, b) => a - b);
      setSelectedSeries(arr.length ? arr : "all");
    }
  }

  const renderHeader = () => (
    <View
      style={{
        backgroundColor: colors.background,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        gap: 12,
      }}
    >
      {/* Sorting + display preference */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          style={{ padding: 6 }}
        >
          <Text style={{ color: colors.text, fontSize: tx(14) }}>
            Tri {sortOrder === "asc" ? "A→Z" : "Z→A"}
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {DISPLAY_OPTIONS.map((opt) => {
            const active = displayPref === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setDisplayPref(opt)}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor: active ? colors.accent : "transparent",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: active ? "#fff" : colors.text,
                    fontSize: tx(14),
                  }}
                >
                  {opt === "hanzi" ? "汉字" : opt === "fr" ? "FR" : "PY"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Column size selection */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: tx(14) }}>Par ligne :</Text>
        {COLUMN_OPTIONS.map((n) => {
          const active = columns === n;
          return (
            <Pressable
              key={n}
              onPress={() => setColumns(n)}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor: active ? colors.accent : "transparent",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.text, fontSize: tx(14) }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Series selection */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Pressable
          onPress={() => toggleSeries("all")}
          style={{
            paddingVertical: 4,
            paddingHorizontal: 8,
            borderRadius: 6,
            backgroundColor: selectedSeries === "all" ? colors.accent : "transparent",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: selectedSeries === "all" ? "#fff" : colors.text, fontSize: tx(14) }}>
            Toutes
          </Text>
        </Pressable>
        {seriesOptions.map((s) => {
          const active = selectedSeries !== "all" && selectedSeries.includes(s);
          return (
            <Pressable
              key={s}
              onPress={() => toggleSeries(s)}
              style={{
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 6,
                backgroundColor: active ? colors.accent : "transparent",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: active ? "#fff" : colors.text, fontSize: tx(14) }}>S{s}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Word }) => {
    const order = displayOrder;
    const scale = 4 / columns;
    return (
      <Pressable
        onPress={() => router.push({ pathname: "/module/2/[id]", params: { id: item.id } })}
        style={{ flex: 1, padding: 6 }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 8,
            paddingVertical: 10 * scale,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
            gap: 4 * scale,
          }}
        >
          <Text style={{ fontSize: tx(24 * scale), color: colors.text, fontWeight: "700" }}>
            {item[order[0]] as string}
          </Text>
          <Text style={{ fontSize: tx(14 * scale), color: colors.text }}>
            {item[order[1]] as string}
          </Text>
          <Text style={{ fontSize: tx(14 * scale), color: colors.text }}>
            {item[order[2]] as string}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      key={columns}
      renderItem={renderItem}
      ListHeaderComponent={renderHeader}
      stickyHeaderIndices={[0]}
      columnWrapperStyle={{ gap: 8 }}
      contentContainerStyle={{ padding: 8, gap: 8 }}
      style={{ flex: 1, backgroundColor: colors.background }}
    />
  );
}
