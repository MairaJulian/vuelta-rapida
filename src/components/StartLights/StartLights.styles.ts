import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens y §Componentes: Semáforo; pantalla 06). */
export const COLORS = {
  /** ink: carcasa */
  housing: '#14171F',
  /** interior de cada columna */
  column: '#22262F',
  /** light-off */
  lampOff: '#353A45',
  /** light-on: oklch(0.62 0.24 27) */
  lampOn: '#EC3B30',
  /** card */
  pill: '#FFFFFF',
  /** ink */
  text: '#14171F',
} as const;

/** Textos de la píldora: mientras se encienden, con las cinco y al apagarse. */
export const LABELS = {
  ready: 'Preparate…',
  wait: 'Esperá…',
  go: '¡Largada!',
} as const;

/** Cuánto queda a la vista "¡Largada!" después de apagarse las luces, en ms. */
export const GO_VISIBLE_MS = 1000;

/** Distancia del semáforo al borde de arriba (pantalla 06: y = 22). */
export const TOP_OFFSET = 22;

const LAMP = 34;
const SHADOW = '0 3px 8px rgba(20, 23, 31, 0.18)';

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Solo informa: los toques pasan a los controles.
    pointerEvents: 'none',
  },
  // Carcasa: radio 24, padding 12 y 10 entre columnas.
  housing: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 24,
    backgroundColor: COLORS.housing,
    boxShadow: SHADOW,
  },
  // Cada columna es una píldora con dos lámparas; se enciende la de abajo.
  column: {
    gap: 8,
    padding: 6,
    borderRadius: 999,
    backgroundColor: COLORS.column,
  },
  lamp: {
    width: LAMP,
    height: LAMP,
    borderRadius: LAMP / 2,
  },
  // Píldora blanca con texto 900/30 (68 % de ancho en Archivo).
  pill: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 26,
    borderRadius: 999,
    backgroundColor: COLORS.pill,
    boxShadow: SHADOW,
  },
  label: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
});
