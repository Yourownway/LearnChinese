import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { ProverbCard } from "../components/ProverbCard";
import { useToast } from "../components/Toast";
import { ZenButton } from "../components/ZenButton";
import { useTheme } from "../hooks/useTheme";

export default function HomeScreen() {
  const { colors, tx, toggleMode, mode, increaseScale, decreaseScale } = useTheme();
  const toast = useToast();
  const router = useRouter();

  const go = (path: string, toastText?: string) => () => {
    if (toastText) toast.show(toastText);
    router.push(path);
  };

  // Animation: fade-in + subtle pulse on the logo
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade-in on mount
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Subtle pulse (zen)
    const pulsate = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    pulsate.start();
    return () => {
      pulsate.stop();
    };
  }, [opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.logo,
            {
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <Text style={[styles.logoText, { color: colors.text, fontSize: tx(36) }]}>汉</Text>
        </Animated.View>
        <Text style={[styles.title, { color: colors.text, fontSize: tx(20) }]}>
          Réviser le chinois
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted, fontSize: tx(13) }]}>
          Minimaliste & Zen
        </Text>
      </View>

      {/* Proverb */}
      <ProverbCard />

      {/* Actions */}
      <View style={styles.actions}>
        <ZenButton title="Révisions" onPress={go("/module/1/settings")} />
        <ZenButton title="Écriture" onPress={go("/module/2/writing")} />
        <ZenButton title="Exercices" onPress={go("/module/1/settings", "Dommage…")} />
        <ZenButton title="Progression" onPress={go("/module/3")} />
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={toggleMode}
          style={styles.footerBtn}
          accessibilityLabel="Basculer mode clair/sombre"
        >
          <Text style={{ color: colors.text, fontSize: tx(14) }}>
            {mode === "dark" ? "Mode clair" : "Mode sombre"}
          </Text>
        </Pressable>
        <View style={styles.footerRight}>
          <Pressable
            onPress={decreaseScale}
            style={styles.footerBtn}
            accessibilityLabel="Réduire la taille du texte"
          >
            <Text style={{ color: colors.text, fontSize: tx(14) }}>A−</Text>
          </Pressable>
          <Pressable
            onPress={increaseScale}
            style={styles.footerBtn}
            accessibilityLabel="Augmenter la taille du texte"
          >
            <Text style={{ color: colors.text, fontSize: tx(14) }}>A+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  header: { alignItems: "center", gap: 6, marginTop: 8 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  logoText: { fontWeight: "900" },
  title: { fontWeight: "800" },
  subtitle: {},
  actions: { gap: 12, marginTop: 8 },
  footer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  footerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
});
