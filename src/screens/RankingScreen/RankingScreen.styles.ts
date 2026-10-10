import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens). */
export const COLORS = {
  /** bg */
  background: '#F6F7F9',
  ink: '#14171F',
  muted: '#5D6472',
} as const;

/** Padding de los menús (encabezado 22/36); se suma a los insets del área segura. */
export const PADDING = { vertical: 22, horizontal: 36 } as const;

/** Columna de los selectores, a la izquierda de la torre. */
export const SIDEBAR_WIDTH = 250;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    gap: 28,
    marginTop: 14,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    gap: 6,
  },
  label: {
    marginTop: 6,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '600',
  },
  tower: {
    flex: 1,
  },
  // Margen para que no se corten las sombras de las filas.
  towerContent: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  empty: {
    marginTop: 24,
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
