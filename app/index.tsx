import { Link } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const MODULES = [1, 2, 3, 4, 5];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu principal</Text>
      <FlatList
        data={MODULES}
        keyExtractor={(n) => String(n)}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <Link href={item === 1 ? "/module/1" : `/module/${item}`} asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Bouton {item} → /module/{item}</Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});