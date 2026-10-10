import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens y §Componentes, "Tarjeta de opción"). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft: presionado de la tarjeta y chip sin récord */
  soft: '#ECEEF2',
  blue: '#2F6BDD',
  /** blue-tint: fondo de la ilustración */
  blueTint: '#EEF2FB',
  ink: '#14171F',
  /** lime: solo récords */
  lime: '#C6EB4C',
} as const;

/**
 * Tarjeta de 188 dp de ancho. El auto va de costado y abajo en la ilustración, de 36 dp
 * de ancho (81 de largo); arriba quedan el número y el lápiz.
 */
export const LAYOUT = {
  cardWidth: 188,
  car: { width: 36, canvasWidth: 130, canvasHeight: 56 },
  /** Lápiz: 2 dp adentro de la ilustración (padding 8 + borde 2,5 + 2). */
  editInset: 12.5,
} as const;

const NUMBER_CIRCLE = 34;

export const styles = StyleSheet.create({
  wrapper: {
    width: LAYOUT.cardWidth,
  },
  // Radio 22, padding 8 y borde de 2,5: transparente, o azul en la del último jugador.
  card: {
    flex: 1,
    padding: 8,
    gap: 10,
    borderRadius: 22,
    borderWidth: 2.5,
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  // El auto abajo, para dejar arriba el número y el lápiz.
  illustration: {
    flex: 1,
    minHeight: 112,
    paddingBottom: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.blueTint,
  },
  numberCircle: {
    position: 'absolute',
    top: 6,
    left: 6,
    minWidth: NUMBER_CIRCLE,
    height: NUMBER_CIRCLE,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  info: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 6,
  },
  // Nombre: 800, 22 dp, mayúsculas; se achica para entrar en una línea.
  name: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chip: {
    alignSelf: 'flex-start',
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
  // Lápiz arriba a la derecha, sobre la ilustración.
  edit: {
    position: 'absolute',
    top: LAYOUT.editInset,
    right: LAYOUT.editInset,
  },
});
