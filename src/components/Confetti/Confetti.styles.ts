import { StyleSheet } from 'react-native';

/** Colores de la paleta del handoff: lima de récord, azul, coral, tinta y blanco. */
export const CONFETTI_COLORS = ['#C6EB4C', '#2F6BDD', '#E04A3A', '#14171F', '#FFFFFF'] as const;

/** Cantidad de papelitos por defecto. */
export const DEFAULT_PIECES = 32;

/** Duración de la caída, en ms. */
export const DEFAULT_DURATION_MS = 2600;

/** Medidas de cada papelito, en dp. */
export const PIECE = { width: 8, height: 14, radius: 2 } as const;

/** Semilla fija: los papelitos caen siempre igual (y los tests son estables). */
export const CONFETTI_SEED = 2026;

export const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: PIECE.width,
    height: PIECE.height,
    borderRadius: PIECE.radius,
  },
});
