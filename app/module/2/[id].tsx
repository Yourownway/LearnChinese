import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, View, Text } from "react-native";
import { useTheme } from "../../../hooks/useTheme";
import { loadWordsLocalOnly, type Word } from "../../../lib/data";
import { canPlayRemoteAudio, getPlayableAudioSource, playAudioFileOrTTS } from "../../../lib/audio";
import { StrokeFan } from "../../../components/StrokeFan";

export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, tx } = useTheme();
  const [word, setWord] = useState<Word | null>(null);
  const [audioDisabled, setAudioDisabled] = useState(false);

  useEffect(() => {
    loadWordsLocalOnly()
      .then((all) => setWord(all.find((w) => w.id === id) || null))
      .catch(() => setWord(null));
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!word) return;
      const playable = await getPlayableAudioSource(word);
      const can = await canPlayRemoteAudio(playable);
      if (!mounted) return;
      setAudioDisabled(!can);
    })();
    return () => {
      mounted = false;
    };
  }, [word]);

  async function onPressAudio() {
    if (audioDisabled || !word) return;
    try {
      await playAudioFileOrTTS(word);
    } catch {
      Alert.alert("Audio", "Impossible de jouer l’audio.");
    }
  }

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
        <StrokeFan char={word.hanzi} />
        <Text style={{ fontSize: tx(24), color: colors.text }}>{word.pinyin}</Text>
        <Text style={{ fontSize: tx(20), color: colors.text }}>{word.fr}</Text>
        <Pressable
          onPress={onPressAudio}
          disabled={audioDisabled}
          style={[{
            marginTop: 8,
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
          },
          audioDisabled && { opacity: 0.4 }]}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>🔊 Écouter</Text>
        </Pressable>
      </View>
    </View>
  );
}
