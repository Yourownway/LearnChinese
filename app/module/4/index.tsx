import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../../hooks/useTheme';

const lightPalette = {
  background: '#FAF8F5',
  text: '#222222',
  primary: '#3B82F6',
  success: '#4CAF50',
  warning: '#F59E0B',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

const darkPalette = {
  background: '#121212',
  text: '#F3F4F6',
  primary: '#3B82F6',
  success: '#4CAF50',
  warning: '#F59E0B',
  card: '#1E1E1E',
  border: '#333333',
};

export default function Module4Palette() {
  const { mode, toggleMode } = useTheme();
  const colors = mode === 'dark' ? darkPalette : lightPalette;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Palette Module 4</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>Texte principal (#222222)</Text>
      <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>Accent principal</Text>
      </Pressable>
      <Pressable style={[styles.button, { backgroundColor: colors.success }]}>
        <Text style={styles.buttonText}>Accent secondaire</Text>
      </Pressable>
      <Pressable style={[styles.button, { backgroundColor: colors.warning }]}>
        <Text style={styles.buttonText}>Accent tertiaire</Text>
      </Pressable>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.text }}>Carte neutre avec bordure</Text>
      </View>
      <Pressable onPress={toggleMode} style={[styles.switchBtn, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>{mode === 'dark' ? 'Mode clair' : 'Mode sombre'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  paragraph: {
    fontSize: 16,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
  },
  switchBtn: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
