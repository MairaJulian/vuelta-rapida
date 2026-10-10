import { StyleSheet } from 'react-native';

/** El auto mirando hacia la derecha, como en la personalización del handoff (rotado 90°). */
export const SIDEWAYS = Math.PI / 2;

export const styles = StyleSheet.create({
  canvas: {
    // Decorativo: los toques pasan a la tarjeta o al botón que lo contiene.
    pointerEvents: 'none',
  },
});
