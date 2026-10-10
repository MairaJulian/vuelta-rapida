import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
} as const;

/** Padding de los menús (22/36, y 26 abajo en la pantalla 05); se suma al área segura. */
export const PADDING = { top: 22, bottom: 26, horizontal: 36 } as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: -PADDING.horizontal,
  },
  // Margen para que no se corten las sombras de las tarjetas.
  listContent: {
    gap: 16,
    paddingHorizontal: PADDING.horizontal,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
});
