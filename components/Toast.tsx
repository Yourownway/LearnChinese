import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type ToastKind = "success" | "error" | "info";
type ToastMsg = { id: number; text: string; kind: ToastKind };

type ToastCtx = {
  show: (text: string, kind?: ToastKind) => void;
};

const Ctx = createContext<ToastCtx | undefined>(undefined);

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { colors, tx } = useTheme();
  const [queue, setQueue] = useState<ToastMsg[]>([]);
  const [opacity] = useState(new Animated.Value(0));

  const show = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now();
    setQueue([{ id, text, kind }]);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => setQueue([]));
      }, 1400);
    });
  }, [opacity]);

  const value = useMemo<ToastCtx>(() => ({ show }), [show]);

  const bg = colors.background === "#000000" ? "#111" : colors.card;

  return (
    <Ctx.Provider value={value}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[styles.container, { opacity }]}
      >
        {queue.map((t) => (
          <View
            key={t.id}
            style={[
              styles.toast,
              { backgroundColor: bg, borderColor: colors.border, shadowColor: "#000" },
            ]}
          >
            <Text style={[styles.text, { color: colors.text, fontSize: tx(14) }]}>{t.text}</Text>
          </View>
        ))}
      </Animated.View>
    </Ctx.Provider>
  );
};

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  text: { fontWeight: "600" },
});
