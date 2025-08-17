import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { getTheme, SCALE, type ThemeColors, type UIMode } from "../constants/theme";

type ThemeContextValue = {
  mode: UIMode;
  colors: ThemeColors;
  scale: number;
  setMode: (m: UIMode) => void;
  toggleMode: () => void;
  increaseScale: () => void;
  decreaseScale: () => void;
  tx: (size: number) => number;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  mode: "ui:mode",
  scale: "ui:scale",
} as const;

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [mode, setModeState] = useState<UIMode>("light");
  const [scale, setScale] = useState<number>(SCALE.default);
  const colors = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    (async () => {
      try {
        const [m, s] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.mode),
          AsyncStorage.getItem(STORAGE_KEYS.scale),
        ]);
        if (m === "light" || m === "dark") setModeState(m);
        if (s) {
          const v = Number(s);
          if (!Number.isNaN(v)) setScale(Math.min(SCALE.max, Math.max(SCALE.min, v)));
        }
      } catch {}
    })();
  }, []);

  const setMode = (m: UIMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEYS.mode, m).catch(() => {});
  };
  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const increaseScale = () => {
    const next = Math.min(SCALE.max, +(scale + SCALE.step).toFixed(2));
    setScale(next);
    AsyncStorage.setItem(STORAGE_KEYS.scale, String(next)).catch(() => {});
  };
  const decreaseScale = () => {
    const next = Math.max(SCALE.min, +(scale - SCALE.step).toFixed(2));
    setScale(next);
    AsyncStorage.setItem(STORAGE_KEYS.scale, String(next)).catch(() => {});
  };
  const tx = (size: number) => Math.round(size * scale);

  const value: ThemeContextValue = useMemo(
    () => ({ mode, colors, scale, setMode, toggleMode, increaseScale, decreaseScale, tx }),
    [mode, colors, scale]
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {children}
      </View>
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
