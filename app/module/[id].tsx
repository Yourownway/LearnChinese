import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function ModulePlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.big}>Module {id}</Text>
      <Text style={styles.sub}>Écran placeholder à remplacer plus tard.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  big: { fontSize: 36, fontWeight: "800", marginBottom: 12 },
  sub: { fontSize: 16, color: "#555" },
});