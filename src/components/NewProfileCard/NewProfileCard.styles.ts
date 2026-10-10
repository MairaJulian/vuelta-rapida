import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Tokens y §Componentes, "Tarjeta de opción"). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft: presionado */
  soft: '#ECEEF2',
  blue: '#2F6BDD',
  /** blue-tint: fondo de la ilustración */
  blueTint: '#EEF2FB',
  white: '#FFFFFF',
  ink: '#14171F',
  muted: '#5D6472',
} as const;

const CIRCLE = 56;

/** Mismo ancho que `ProfileCard`, para que la fila quede pareja. */
export const CARD_WIDTH = 188;

export const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    padding: 8,
    gap: 10,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: 'transparent',
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
  illustration: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueTint,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue,
  },
  info: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 2,
  },
  title: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
  },
});
