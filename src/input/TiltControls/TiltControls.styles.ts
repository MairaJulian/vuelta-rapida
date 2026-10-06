import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y §Componentes). */
export const COLORS = {
  /** coral */
  brake: '#E04A3A',
  /** coral-pressed */
  brakePressed: '#C0352A',
  brakeLabel: '#FFFFFF',
} as const;

/** Freno lateral del modo inclinación: 76 × 128 dp, radio 38. */
const BRAKE = { width: 76, height: 128 } as const;

/**
 * Distancia a los bordes según la pantalla 07a: frenos a 20 dp del costado y 22
 * de abajo; indicador abajo al centro. Se suma a los insets del área segura.
 */
export const OFFSETS = {
  brake: { side: 20, bottom: 22 },
  indicator: { bottom: 14 },
} as const;

export const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'box-none',
  },
  brake: {
    position: 'absolute',
    width: BRAKE.width,
    height: BRAKE.height,
    borderRadius: BRAKE.width / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra lg del handoff.
    boxShadow: '0 3px 8px rgba(20, 23, 31, 0.18)',
  },
  brakeLabel: {
    color: COLORS.brakeLabel,
    fontSize: 20,
    fontWeight: '800',
  },
  indicatorRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
});
