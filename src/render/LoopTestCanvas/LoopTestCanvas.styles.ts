import { StyleSheet } from 'react-native';

/** Paleta tomada de docs/design (README, sección de tokens). */
export const COLORS = {
  background: '#F6F7F9',
  box: '#2F6BDD',
  text: '#14171F',
} as const;

export const BOX = {
  width: 80,
  height: 48,
  radius: 8,
} as const;

export const FPS_LABEL = {
  x: 24,
  y: 40,
  fontFamily: 'sans-serif',
  fontSize: 28,
} as const;

export const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
