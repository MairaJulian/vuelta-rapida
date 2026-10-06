import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { clamp } from '@/core/MathUtils';
import { getFullTurnAngle } from '@/core/TiltSteering';

import { FLAT_OPACITY, SIZES, styles, TRAVEL } from './SteeringIndicator.styles';
import type { SteeringIndicatorProps } from './SteeringIndicator.types';

/** Desplazamiento del punto desde el centro, en dp: a giro completo llega al borde. */
export function indicatorOffset(relativeAngle: number, fullTurnAngle: number): number {
  'worklet';
  const ratio = fullTurnAngle > 0 ? clamp(relativeAngle / fullTurnAngle, -1, 1) : 0;
  return ratio * TRAVEL;
}

/** Ancho de la franja de zona muerta: con el punto adentro, el auto va derecho. */
export function getDeadZoneWidth(deadZone: number, fullTurnAngle: number): number {
  const ratio = fullTurnAngle > 0 ? clamp(deadZone / fullTurnAngle, 0, 1) : 0;
  return 2 * ratio * TRAVEL + SIZES.dot;
}

/**
 * Indicador de volante del HUD de inclinación (pantalla 07a): una píldora con la
 * zona muerta al centro y un punto que sigue la inclinación del celular. El punto
 * se mueve en el hilo de UI; con el celular plano se atenúa.
 */
export function SteeringIndicator({ output, config, style }: SteeringIndicatorProps) {
  const fullTurnAngle = getFullTurnAngle(config.sensitivity);

  const dotStyle = useAnimatedStyle(() => {
    const { relativeAngle, confidence } = output.get();
    return {
      opacity: FLAT_OPACITY + (1 - FLAT_OPACITY) * confidence,
      transform: [{ translateX: indicatorOffset(relativeAngle, fullTurnAngle) }],
    };
  });

  return (
    <View
      testID="steering-indicator"
      style={[styles.pill, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID="steering-indicator-dead-zone"
        style={[styles.deadZone, { width: getDeadZoneWidth(config.deadZone, fullTurnAngle) }]}
      />
      <Animated.View testID="steering-indicator-dot" style={[styles.dot, dotStyle]} />
    </View>
  );
}
