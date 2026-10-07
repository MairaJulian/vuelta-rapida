import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y pantalla 07). */
export const COLORS = {
  /** card */
  pill: '#FFFFFF',
  /** ink */
  value: '#14171F',
  /** muted */
  label: '#5D6472',
} as const;

/** Distancias al borde de la pantalla (pantalla 07): 14 arriba y 28 a los costados. */
export const OFFSETS = { top: 14, side: 28 } as const;

/** Cada cuánto se actualizan los textos, en ms: el tiempo cambia en cada cuadro. */
export const HUD_INTERVAL_MS = 50;

/** Sin récord todavía. */
export const NO_RECORD = '–:––.–––';

const SHADOW = '0 2px 6px rgba(20, 23, 31, 0.14)';

export const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Solo informa: los toques pasan a los controles y al panel.
    pointerEvents: 'none',
  },
  // "Vuelta" y "Mejor": radio 16 y padding 6/14.
  sidePill: {
    position: 'absolute',
    top: 0,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.pill,
    boxShadow: SHADOW,
  },
  label: {
    color: COLORS.label,
    fontSize: 11,
    fontWeight: '600',
  },
  lapValue: {
    color: COLORS.value,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  bestValue: {
    color: COLORS.value,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Cronómetro: píldora con padding 4/22. 32 en lugar de 36: la fuente del sistema es más ancha que Archivo.
  timerPill: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 22,
    backgroundColor: COLORS.pill,
    boxShadow: SHADOW,
  },
  timerValue: {
    color: COLORS.value,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
});
