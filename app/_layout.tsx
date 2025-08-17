import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ToastProvider } from "../components/Toast";
import { ThemeProvider, useTheme } from "../hooks/useTheme";

function Navigator() {
	const { colors } = useTheme();
	return (
		<SafeAreaProvider>
       <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: colors.card },
					headerTitleStyle: { fontWeight: "600", color: colors.text },
					headerTintColor: colors.text,
					headerShown: false,
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen name="index" options={{ title: "Réviser le chinois" }} />
				<Stack.Screen
					name="module/1/settings"
					options={{ title: "Module 1 — Paramètres" }}
				/>
				<Stack.Screen
					name="module/1/index"
					options={{ title: "Module 1 — Jeu" }}
				/>
				<Stack.Screen name="module/[id]" options={{ title: "Module" }} />
			</Stack>
      </SafeAreaView>
		</SafeAreaProvider>
	);
}

export default function RootLayout() {
	return (
		<ThemeProvider>
			<ToastProvider>
				<Navigator />
			</ToastProvider>
		</ThemeProvider>
	);
}
