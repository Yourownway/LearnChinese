import React from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  style?: StyleProp<ViewStyle>;
};

export const ZenButton: React.FC<Props> = ({ title, onPress, disabled, testID, icon, style }) => {
  const { colors, tx } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.accent,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: "#000",
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {icon && <Ionicons name={icon} size={tx(18)} color="#fff" />}
          <Text style={[styles.title, { color: "#fff", fontSize: tx(16) }]}>{title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={tx(20)} color="#fff" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 0,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontWeight: "700" },
});
