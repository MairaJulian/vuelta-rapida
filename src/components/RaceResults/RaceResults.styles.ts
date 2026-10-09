import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 09). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  card: '#FFFFFF',
  ink: '#14171F',
  muted: '#5D6472',
  /** lime: solo récords */
  lime: '#C6EB4C',
  blue: '#2F6BDD',
  /** blue-soft: fila de la mejor vuelta */
  blueSoft: '#E9EFFC',
  /** delta-slower-soft: fondo y texto del chip "+x.xxx" */
  slowerSoft: '#FCE5E2',
  slowerText: '#B5302A',
} as const;

/** Medidas de la pantalla 09, en dp. */
export const LAYOUT = {
  inset: 14,
  cardWidth: 390,
  /** La columna derecha empieza en x = 428. */
  columnGap: 24,
  /** Margen derecho de la columna. */
  columnRight: 28,
  /** Casillas de la bandera recortada de la tarjeta. */
  checkerSquare: 8,
  checkerColumns: 12,
  checkerRows: 6,
} as const;

const SHADOW_SM = '0 1px 3px rgba(20, 23, 31, 0.12)';

export const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.background,
  },
  // Tarjeta: radio 24, padding 26/28; lima con récord, blanca sin récord.
  card: {
    position: 'absolute',
    width: LAYOUT.cardWidth,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  cardPlain: {
    boxShadow: SHADOW_SM,
  },
  checker: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: LAYOUT.checkerSquare * LAYOUT.checkerColumns,
    height: LAYOUT.checkerSquare * LAYOUT.checkerRows,
  },
  checkerSquare: {
    position: 'absolute',
    width: LAYOUT.checkerSquare,
    height: LAYOUT.checkerSquare,
    backgroundColor: COLORS.ink,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: COLORS.muted,
    fontSize: 12,
  },
  bestLabel: {
    marginTop: 18,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  // El handoff usa 96 con Archivo angosta; con la fuente del sistema, 76 y se achica si no entra.
  bestTime: {
    color: COLORS.ink,
    fontSize: 76,
    lineHeight: 80,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  totalLabel: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  // Píldora tinta abajo: el delta contra el récord anterior.
  deltaPill: {
    position: 'absolute',
    left: 28,
    bottom: 26,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  deltaValue: {
    fontSize: 19,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  deltaCaption: {
    fontSize: 13,
    fontWeight: '600',
  },
  column: {
    position: 'absolute',
  },
  columnHeader: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  laps: {
    flex: 1,
    marginTop: 10,
  },
  lapsContent: {
    gap: 8,
  },
  // Una fila blanca por vuelta, radio 16; la mejor, en blue-soft.
  lapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    borderRadius: 16,
    boxShadow: SHADOW_SM,
  },
  lapLabel: {
    width: 68,
    color: COLORS.muted,
    fontSize: 13,
  },
  lapTime: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chip: {
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
  },
});
