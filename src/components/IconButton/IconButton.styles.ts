import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Componentes, "Botón ícono"). */
export const COLORS = {
  card: '#FFFFFF',
  /** soft: presionado de los secundarios */
  pressed: '#ECEEF2',
  ink: '#14171F',
} as const;

/** Lado del ícono según el diámetro del botón (22 a 24 dp). */
export const ICON_SIZE = { 48: 22, 56: 24 } as const;

export const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    // Sombra sm del handoff.
    boxShadow: '0 1px 3px rgba(20, 23, 31, 0.12)',
  },
});
