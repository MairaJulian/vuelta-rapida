import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** card */
  card: '#FFFFFF',
  /** ink */
  ink: '#14171F',
  /** muted */
  muted: '#5D6472',
  /** blue-soft: la fila del jugador */
  playerRow: '#E9EFFC',
} as const;

/** Alto de una fila, en dp. */
export const ROW_HEIGHT = 22;

export const styles = StyleSheet.create({
  // Mismo estilo que las píldoras del HUD: blanca, radio 16 y sombra `md`.
  table: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    boxShadow: '0 2px 6px rgba(20, 23, 31, 0.14)',
    gap: 1,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  place: {
    width: 14,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
  },
  name: {
    minWidth: 64,
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '800',
  },
});
