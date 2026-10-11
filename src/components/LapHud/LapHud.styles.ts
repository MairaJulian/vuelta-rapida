import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y pantalla 07). */
export const COLORS = {
  /** card */
  pill: '#FFFFFF',
  /** ink */
  value: '#14171F',
  /** muted */
  label: '#5D6472',
  /** faint: el "/3" del contador de vueltas */
  faint: '#9AA1AD',
  /** soft: botón presionado */
  pressed: '#ECEEF2',
  /** delta-faster: diferencia a favor */
  faster: '#2E9A55',
  /** delta-slower: diferencia en contra */
  slower: '#D83B3B',
  white: '#FFFFFF',
} as const;

/** Distancias al borde de la pantalla (pantalla 07): 14 arriba y 28 a los costados. */
export const OFFSETS = { top: 14, side: 28, gap: 10 } as const;

/** Botón de pausa: Ø 48 (pantalla 07). */
export const PAUSE_SIZE = 48;

/** Cada cuánto se actualizan los textos, en ms: el tiempo cambia en cada cuadro. */
export const HUD_INTERVAL_MS = 50;

/** Sin récord todavía. */
export const NO_RECORD = '–:––.–––';

/** Tamaño del ícono del fantasma en el chip de diferencia. */
export const DELTA_ICON_SIZE = 16;

const SHADOW = '0 2px 6px rgba(20, 23, 31, 0.14)';

export const styles = StyleSheet.create({
  pause: {
    position: 'absolute',
    top: 0,
    width: PAUSE_SIZE,
    height: PAUSE_SIZE,
    borderRadius: PAUSE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: SHADOW,
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Solo el botón de pausa recibe toques; el resto pasa a los controles y al panel.
    pointerEvents: 'box-none',
  },
  // "Vuelta" y "Mejor": radio 16 y padding 6/14.
  sidePill: {
    position: 'absolute',
    pointerEvents: 'none',
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
  lapTotal: {
    color: COLORS.faint,
    fontSize: 20,
    fontWeight: '800',
  },
  bestValue: {
    color: COLORS.value,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Chip de diferencia con el fantasma (handoff): píldora de 3/12, texto blanco 800 de 15 y
  // el ícono del fantasma de 16. Va debajo del cronómetro.
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 999,
    pointerEvents: 'none',
    boxShadow: SHADOW,
  },
  deltaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Cronómetro: píldora con padding 4/22. 32 en lugar de 36: la fuente del sistema es más ancha que Archivo.
  timerPill: {
    pointerEvents: 'none',
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
