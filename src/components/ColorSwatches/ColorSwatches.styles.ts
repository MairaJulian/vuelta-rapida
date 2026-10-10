import { StyleSheet } from 'react-native';

/** Tokens del handoff (README §Componentes, "Muestra de color"; pantalla 04). */
export const COLORS = {
  /** Anillo de la elegida. */
  ring: '#14171F',
  /** Borde fino de cada muestra, para que el blanco se vea sobre el fondo. */
  edge: 'rgba(20, 23, 31, 0.12)',
} as const;

const SWATCH = 48;

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  // Ø 48 con padding 4 y anillo de 2,5: transparente, o tinta en la elegida.
  swatch: {
    width: SWATCH,
    height: SWATCH,
    padding: 4,
    borderWidth: 2.5,
    borderRadius: SWATCH / 2,
  },
  fill: {
    flex: 1,
    borderRadius: SWATCH / 2,
    borderWidth: 1,
    borderColor: COLORS.edge,
  },
});
