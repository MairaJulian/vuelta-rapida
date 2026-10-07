import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  card: '#FFFFFF',
  /** ink */
  text: '#14171F',
  /** muted */
  muted: '#5D6472',
} as const;

/** Padding de los menús (22/36); se suma a los insets del área segura. */
export const PADDING = { vertical: 22, horizontal: 36 } as const;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Grilla de tres columnas del handoff: 190 | flexible | 230.
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instructions: {
    width: 190,
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '500',
    lineHeight: 26,
  },
  bold: {
    fontWeight: '800',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  caption: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  // Compacta para que los dos sliders y Listo entren en un celular de 360 dp de alto.
  card: {
    width: 230,
    padding: 14,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    // Sombra sm del handoff.
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scaleLabel: {
    color: COLORS.muted,
    fontSize: 12,
  },
});
