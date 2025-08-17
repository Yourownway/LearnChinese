import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../hooks/useTheme";

type Props = {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  testID?: string;
};

export const FauxTextarea: React.FC<Props> = ({ value, disabled, placeholder, testID }) => {
  const { colors, tx } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.area,
        {
          borderColor: colors.border,
          backgroundColor: disabled ? (colors.background === "#000000" ? "#0a0a0a" : "#f4f4f4") : "#fafafa",
        },
      ]}
      accessible
      accessibilityLabel={placeholder || "Zone d'indices"}
    >
      <Text
        style={[
          styles.text,
          { color: value ? colors.text : colors.muted, fontSize: tx(16) },
        ]}
        numberOfLines={2}
      >
        {value || placeholder || "—"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  area: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  text: {},
});
