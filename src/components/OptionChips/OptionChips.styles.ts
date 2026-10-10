import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens: el azul es "todo lo tocable y la selección"). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft: presionado */
  pressed: '#ECEEF2',
  blue: '#2F6BDD',
  /** blue-pressed */
  bluePressed: '#1F55BC',
  ink: '#14171F',
  white: '#FFFFFF',
} as const;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  // Píldora de 48 de alto: todo lo tocable mide 48 o más.
  chip: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
    justifyContent: 'center',
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
});
