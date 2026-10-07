import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { clamp } from '@/core/MathUtils';
import { getFullTurnAngle } from '@/core/TiltSteering';

import { FLAT_OPACITY, SCALE_DEGREES, SIZES, styles, TRAVEL } from './SteeringIndicator.styles';
import type { SteeringIndicatorProps } from './SteeringIndicator.types';

const DEG = Math.PI / 180;

/**
 * Desplazamiento desde el centro, en dp, para una inclinación en radianes. Escala
 * fija: `SCALE_DEGREES` llevan al borde, con cualquier sensibilidad y zona muerta.
 */
export function indicatorOffset(relativeAngle: number): number {
  'worklet';
  return clamp(relativeAngle / (SCALE_DEGREES * DEG), -1, 1) * TRAVEL;
}

/** Ancho de la franja de zona muerta: con el punto adentro, el auto va derecho. */
export function getDeadZoneWidth(deadZone: number): number {
  return 2 * indicatorOffset(Math.max(deadZone, 0)) + SIZES.dot;
}

/**
 * Indicador de volante del HUD de inclinación (pantalla 07a): una píldora con la
 * zona muerta al centro, dos marcas de giro completo y un punto que sigue la
 * inclinación del celular, todo en la misma escala de grados. El punto se mueve en
 * el hilo de UI; con el celular plano se atenúa.
 */
export function SteeringIndicator({ output, config, style }: SteeringIndicatorProps) {
  const fullTurnOffset = indicatorOffset(getFullTurnAngle(config.deadZone, config.sensitivity));

  const dotStyle = useAnimatedStyle(() => {
    const { relativeAngle, confidence } = output.get();
    return {
      opacity: FLAT_OPACITY + (1 - FLAT_OPACITY) * confidence,
      transform: [{ translateX: indicatorOffset(relativeAngle) }],
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
        style={[styles.deadZone, { width: getDeadZoneWidth(config.deadZone) }]}
      />
      {[-fullTurnOffset, fullTurnOffset].map((offset) => (
        <View
          key={offset}
          testID="steering-indicator-full-turn"
          style={[styles.fullTurn, { transform: [{ translateX: offset }] }]}
        />
      ))}
      <Animated.View testID="steering-indicator-dot" style={[styles.dot, dotStyle]} />
    </View>
  );
}
