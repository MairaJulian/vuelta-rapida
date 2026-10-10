import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Componentes, "Paso numérico"; pantalla 04). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft */
  button: '#ECEEF2',
  buttonPressed: '#DFE2E7',
  ink: '#14171F',
} as const;

const BUTTON = 48;

export const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: COLORS.card,
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.1)',
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Valor: 900, 32 dp, cifras tabulares.
  value: {
    width: 52,
    textAlign: 'center',
    color: COLORS.ink,
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
