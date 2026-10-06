import { StyleSheet } from 'react-native';

/** Colores de la pantalla 03 del handoff. */
export const COLORS = {
  /** Trazo del arco: #E3E6EB */
  track: '#E3E6EB',
  /** blue-zone */
  deadZone: '#B5C8F2',
  /** blue */
  marker: '#2F6BDD',
  ring: '#FFFFFF',
  phone: '#FFFFFF',
  /** ink */
  degrees: '#14171F',
} as const;

/** Lienzo del medidor y arco de 260 dp de ancho con trazo de 14 y extremos redondeados. */
export const GAUGE = {
  width: 260,
  height: 190,
  centerX: 130,
  centerY: 150,
  radius: 116,
  stroke: 14,
  /** Hasta dónde llega el marcador a cada lado de arriba con la dirección a fondo, en grados. */
  span: 75,
  markerRadius: 9,
  ringRadius: 12,
} as const;

/** Silueta del teléfono: tarjeta de 132 × 68 dp que gira con el ángulo. */
export const PHONE = { width: 132, height: 68, centerY: 140 } as const;

/** Cada cuánto se actualiza el texto de los grados, en ms (el giro de la tarjeta va por cuadro). */
export const DEGREES_INTERVAL_MS = 100;

export const styles = StyleSheet.create({
  container: {
    width: GAUGE.width,
    height: GAUGE.height,
  },
  canvas: {
    position: 'absolute',
    width: GAUGE.width,
    height: GAUGE.height,
  },
  phone: {
    position: 'absolute',
    left: (GAUGE.width - PHONE.width) / 2,
    top: PHONE.centerY - PHONE.height / 2,
    width: PHONE.width,
    height: PHONE.height,
    borderRadius: 16,
    backgroundColor: COLORS.phone,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra md del handoff.
    boxShadow: '0 2px 6px rgba(20, 23, 31, 0.14)',
  },
  degrees: {
    color: COLORS.degrees,
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
  },
});
