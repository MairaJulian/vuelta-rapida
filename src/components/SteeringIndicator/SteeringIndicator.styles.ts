import { StyleSheet } from 'react-native';

/** Tokens del handoff (docs/design, README §Tokens y pantalla 07a). */
export const COLORS = {
  pill: '#FFFFFF',
  /** blue-zone: zona muerta */
  deadZone: '#B5C8F2',
  /** blue */
  dot: '#2F6BDD',
  /** muted: marcas de giro completo */
  fullTurn: '#5D6472',
} as const;

/** Píldora de 168 × 24 dp con un punto de 16 dp y 4 dp de margen interno. */
export const SIZES = {
  width: 168,
  height: 24,
  dot: 16,
  padding: 4,
  deadZoneHeight: 8,
  tickWidth: 2,
  tickHeight: 12,
} as const;

/** Recorrido del centro del punto a cada lado, en dp. */
export const TRAVEL = (SIZES.width - 2 * SIZES.padding - SIZES.dot) / 2;

/**
 * Escala fija: grados de inclinación que llevan el punto al borde. La misma que el
 * medidor de calibración; alcanza para el giro completo más suave posible (49°).
 */
export const SCALE_DEGREES = 50;

/** Opacidad del punto con el celular plano (sin lectura confiable). */
export const FLAT_OPACITY = 0.35;

export const styles = StyleSheet.create({
  pill: {
    width: SIZES.width,
    height: SIZES.height,
    borderRadius: SIZES.height / 2,
    backgroundColor: COLORS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra md del handoff (HUD).
    boxShadow: '0 2px 6px rgba(20, 23, 31, 0.14)',
  },
  deadZone: {
    position: 'absolute',
    height: SIZES.deadZoneHeight,
    borderRadius: SIZES.deadZoneHeight / 2,
    backgroundColor: COLORS.deadZone,
  },
  fullTurn: {
    position: 'absolute',
    width: SIZES.tickWidth,
    height: SIZES.tickHeight,
    borderRadius: SIZES.tickWidth / 2,
    backgroundColor: COLORS.fullTurn,
  },
  dot: {
    position: 'absolute',
    width: SIZES.dot,
    height: SIZES.dot,
    borderRadius: SIZES.dot / 2,
    backgroundColor: COLORS.dot,
  },
});
