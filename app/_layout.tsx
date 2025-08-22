import { Stack } from "expo-router";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ToastProvider } from "../components/Toast";
import { ThemeProvider, useTheme } from "../hooks/useTheme";
import { useFonts } from "expo-font";
import { Text } from "react-native";

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
        const [fontsLoaded] = useFonts({
                Roboto: require("../assets/fonts/Roboto-Regular.ttf"),
                Rubik: require("../assets/fonts/Rubik-Regular.ttf"),
                NotoSerifSC: require("../assets/fonts/NotoSerifSC-Regular.ttf"),
        });

        if (!fontsLoaded) {
                return null;
        }

        Text.defaultProps = Text.defaultProps || {};
        Text.defaultProps.style = {
                ...(Text.defaultProps.style as object),
                fontFamily: "Roboto",
        };

        return (
                <ThemeProvider>
                        <ToastProvider>
                                <Navigator />
                        </ToastProvider>
                </ThemeProvider>
        );
}
