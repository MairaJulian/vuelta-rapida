import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; velo y panel como en la Pausa, pantalla 08). */
export const COLORS = {
  /** backdrop: el único velo translúcido */
  backdrop: 'rgba(20, 23, 31, 0.55)',
  /** bg */
  panel: '#F6F7F9',
  ink: '#14171F',
  /** ink-2 */
  text: '#3A404C',
} as const;

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  // Tocar el velo cancela.
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.backdrop,
  },
  // Panel: radio 24, padding 22/24, como el de la Pausa.
  panel: {
    width: 420,
    maxWidth: '100%',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 24,
    backgroundColor: COLORS.panel,
  },
  title: {
    color: COLORS.ink,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
  },
  message: {
    marginTop: 8,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
  },
  buttons: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});
