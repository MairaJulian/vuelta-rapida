import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens; pantalla 01). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  card: '#FFFFFF',
  ink: '#14171F',
  muted: '#5D6472',
  blue: '#2F6BDD',
  /** blue-num: el número gigante sobre el panel azul */
  blueNumber: '#4880EA',
  /** Con el auto azul, en el panel azul se muestra blanco. */
  car: '#FFFFFF',
} as const;

/** Medidas de la pantalla 01, en dp. */
export const LAYOUT = {
  panelInset: 14,
  panelWidth: 370,
  columnLeft: 44,
  columnTop: 30,
  recordBottom: 18,
  /** Auto: 100 dp de ancho, girado −20°. */
  carWidth: 100,
  carRotation: (-20 * Math.PI) / 180,
  carCanvas: { width: 220, height: 280 },
} as const;

/** Número del auto en el panel. Todavía no se personaliza: el 7 de la escudería Cóndor (azul). */
export const CAR_NUMBER = '7';

/** Mini bandera a cuadros del chip: 2 × 2 casillas de 7 dp. */
const CHECKER = 7;

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  panel: {
    position: 'absolute',
    width: LAYOUT.panelWidth,
    borderRadius: 24,
    backgroundColor: COLORS.blue,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Número gigante (900, 360 dp) cortado por el panel.
  number: {
    position: 'absolute',
    right: -24,
    top: -70,
    color: COLORS.blueNumber,
    fontSize: 360,
    lineHeight: 400,
    fontWeight: '900',
    letterSpacing: -20,
  },
  carCanvas: {
    width: LAYOUT.carCanvas.width,
    height: LAYOUT.carCanvas.height,
  },
  column: {
    position: 'absolute',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.1)',
  },
  checker: {
    width: CHECKER * 2,
    height: CHECKER * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  checkerSquare: {
    width: CHECKER,
    height: CHECKER,
  },
  chipText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  // Logo: 900, 84 dp, mayúsculas, interlineado apretado.
  logo: {
    marginTop: 12,
    fontSize: 84,
    lineHeight: 76,
    fontWeight: '900',
    letterSpacing: -2,
  },
  run: {
    marginTop: 22,
    alignSelf: 'flex-start',
  },
  record: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  recordLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  recordValue: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
