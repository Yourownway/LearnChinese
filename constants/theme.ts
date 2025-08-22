import { Platform } from "react-native";

export type UIMode = "light" | "dark";

export const THEME_COLORS = {
  light: {
    background: "#F5F7FA",
    text: "#1F2937",
    muted: "#6B7280",
    card: "#FFFFFF",
    border: "#E5E7EB",
    accent: "#3B82F6",
  },
  dark: {
    background: "#1F2937",
    text: "#F9FAFB",
    muted: "#D1D5DB",
    card: "#374151",
    border: "#4B5563",
    accent: "#60A5FA",
  },
} as const;

export type ThemeColors = typeof THEME_COLORS.light;

export function getTheme(mode: UIMode): ThemeColors {
  return mode === "dark" ? THEME_COLORS.dark : THEME_COLORS.light;
}

// Typo par défaut (sans-serif moderne) + recommandation pour le chinois
export const FONTS = {
  ui: Platform.select({ ios: "System", android: "sans-serif", default: "system-ui" }),
  han: "Noto Sans SC", // si dispo (fallback système OK)
};

// Bornes pour l’échelle globale A−/A+
export const SCALE = {
  min: 0.85,
  max: 1.4,
  step: 0.07,
  default: 1.0,
} as const;
