import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 05). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft: presionado y chip sin récord */
  soft: '#ECEEF2',
  blue: '#2F6BDD',
  /** blue-tint: ilustración de la tarjeta no elegida */
  blueTint: '#EEF2FB',
  white: '#FFFFFF',
  ink: '#14171F',
  muted: '#5D6472',
  /** coral: marca de la meta */
  coral: '#E04A3A',
  /** lime: solo récords */
  lime: '#C6EB4C',
} as const;

/** Medidas de la pantalla 05, en dp. */
export const LAYOUT = {
  cardWidth: 240,
  /** Ilustración: 88 de alto; el trazado de 4,5 con un margen de 10. */
  illustration: { height: 88, padding: 10, stroke: 4.5 },
  /** Marca de la meta: 3 × 8, radio 1. */
  finishMark: { width: 3, height: 8, r: 1 },
} as const;

/** Ancho de la ilustración: la tarjeta menos su padding (8) y su borde (2,5). */
export const ILLUSTRATION_WIDTH = LAYOUT.cardWidth - 2 * (8 + 2.5);

export const styles = StyleSheet.create({
  // Tarjeta de opción: radio 22, padding 8, borde de 2,5 (azul en la elegida).
  card: {
    width: LAYOUT.cardWidth,
    padding: 8,
    gap: 8,
    borderRadius: 22,
    borderWidth: 2.5,
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  illustration: {
    height: LAYOUT.illustration.height,
    borderRadius: 14,
    overflow: 'hidden',
  },
  canvas: {
    width: ILLUSTRATION_WIDTH,
    height: LAYOUT.illustration.height,
    pointerEvents: 'none',
  },
  info: {
    paddingHorizontal: 6,
    paddingBottom: 6,
    gap: 2,
  },
  // Nombre: 800, 22 dp.
  name: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  summary: {
    color: COLORS.muted,
    fontSize: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Punto del color de quien tiene el récord.
  holderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(20, 23, 31, 0.25)',
  },
});
