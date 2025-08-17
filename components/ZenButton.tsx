import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
};

export const ZenButton: React.FC<Props> = ({ title, onPress, disabled, testID }) => {
  const { colors, tx } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: "#000",
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text, fontSize: tx(16) }]}>{title}</Text>
        <Text style={[styles.chevron, { color: colors.accent, fontSize: tx(20) }]}>›</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: "700" },
  chevron: { fontWeight: "800" },
});
