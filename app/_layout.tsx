import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: scheme === "dark" ? "#111" : "#fff" },
          headerTitleStyle: { fontWeight: "600" },
          headerTintColor: scheme === "dark" ? "#fff" : "#111",
          contentStyle: { backgroundColor: scheme === "dark" ? "#000" : "#fafafa" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Réviser le chinois" }} />
        {/* Le module 1 a un écran dédié (jeu) */}
        <Stack.Screen name="module/1/index" options={{ title: "Module 1 — Jeu" }} />
        {/* Les autres modules passent par l’écran placeholder */}
        <Stack.Screen name="module/[id]" options={{ title: "Module" }} />
      </Stack>
    </>
  );
}