import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  /** muted */
  footer: '#5D6472',
} as const;

/** Padding de los menús (encabezado 22/36); se suma a los insets del área segura. */
export const PADDING = { vertical: 22, horizontal: 36 } as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cards: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    marginTop: 18,
  },
  footer: {
    marginTop: 14,
    color: COLORS.footer,
    fontSize: 13,
  },
});
