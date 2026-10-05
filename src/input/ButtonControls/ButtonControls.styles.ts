import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y §Controles). 1 px del mockup = 1 dp. */
export const COLORS = {
  steer: '#FFFFFF',
  /** blue-soft */
  steerPressed: '#E9EFFC',
  /** ink */
  arrow: '#14171F',
  /** coral */
  brake: '#E04A3A',
  /** coral-pressed */
  brakePressed: '#C0352A',
  brakeLabel: '#FFFFFF',
} as const;

const STEER_SIZE = 76;
const BRAKE_SIZE = 96;

/**
 * Distancia a los bordes según el handoff (margen lateral del HUD: 28). Se suma a
 * los insets del área segura, para no quedar debajo de la barra de navegación.
 */
export const OFFSETS = {
  steer: { left: 28, bottom: 18 },
  brake: { right: 28, bottom: 14 },
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
  steerGroup: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 14,
  },
  steerButton: {
    width: STEER_SIZE,
    height: STEER_SIZE,
    borderRadius: STEER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra lg del handoff.
    boxShadow: '0 3px 8px rgba(20, 23, 31, 0.18)',
  },
  // Chevron dibujado con bordes: un triángulo de 17 × 24 dp, sin librería de iconos.
  arrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: COLORS.arrow,
    marginRight: 4,
  },
  arrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: COLORS.arrow,
    marginLeft: 4,
  },
  brakeButton: {
    position: 'absolute',
    width: BRAKE_SIZE,
    height: BRAKE_SIZE,
    borderRadius: BRAKE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 8px rgba(20, 23, 31, 0.18)',
  },
  brakeLabel: {
    color: COLORS.brakeLabel,
    fontSize: 20,
    fontWeight: '800',
  },
});
