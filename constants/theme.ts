import { Platform } from "react-native";

export type UIMode = "light" | "dark";

export const THEME_COLORS = {
  light: {
    background: "#FDFBF7", // crème
    text: "#111111",
    muted: "#5A5A5A",
    card: "#FFFFFF",
    border: "rgba(0,0,0,.06)",
    accent: "#1AA890", // jade
  },
  dark: {
    background: "#000000", // noir
    text: "#FFFFFF",
    muted: "#D0D0D0",
    card: "#111111",
    border: "rgba(255,255,255,.12)",
    accent: "#FFFFFF", // pas de couleur en sombre
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
