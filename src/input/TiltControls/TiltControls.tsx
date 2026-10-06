import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SteeringIndicator } from '@/components/SteeringIndicator';
import { useTiltSteering } from '@/hooks/useTiltSteering';
import { createHoldGesture, NEUTRAL_INPUT, vibrateOnBrake } from '@/input/InputControls';

import { COLORS, OFFSETS, styles } from './TiltControls.styles';
import type { BrakeSide, PressedBrakes, TiltControlsProps } from './TiltControls.types';

const RELEASED: PressedBrakes = { left: false, right: false };

/** Freno según los frenos laterales: cualquiera de los dos frena a fondo, y los dos juntos igual. */
export function brakesToInput(pressed: PressedBrakes): number {
  'worklet';
  return pressed.left || pressed.right ? 1 : 0;
}

/**
 * Modo de control por inclinación: el celular es el volante y quedan en pantalla
 * solo los dos frenos laterales (también dan marcha atrás) y el indicador de
 * volante, según la pantalla 07a del handoff. La dirección la escribe
 * `useTiltSteering` en cada cuadro; los frenos escriben solo `brake`. Todo corre
 * en el hilo de UI.
 */
export function TiltControls({ input, config, output }: TiltControlsProps) {
  const insets = useSafeAreaInsets();
  const pressed = useSharedValue<PressedBrakes>(RELEASED);
  const tilt = useTiltSteering({ config, input, output });

  const gestures = useMemo(() => {
    const setBrake = (side: BrakeSide, isDown: boolean) => {
      'worklet';
      const current = pressed.get();
      const next = { ...current, [side]: isDown };
      pressed.set(next);
      const brake = brakesToInput(next);
      input.set({ steer: input.get().steer, brake });
      // Vibra solo al empezar a frenar: apoyar el segundo pulgar no vuelve a vibrar.
      if (brake > 0 && brakesToInput(current) === 0) {
        scheduleOnRN(vibrateOnBrake);
      }
    };
    return {
      left: createHoldGesture('brake-left', (isDown) => {
        'worklet';
        setBrake('left', isDown);
      }),
      right: createHoldGesture('brake-right', (isDown) => {
        'worklet';
        setBrake('right', isDown);
      }),
    };
  }, [input, pressed]);

  // Si el modo de control se desmonta con un freno apretado o el celular girado, el auto no debe seguir así.
  useEffect(() => () => input.set(NEUTRAL_INPUT), [input]);

  const leftStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get().left ? COLORS.brakePressed : COLORS.brake,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get().right ? COLORS.brakePressed : COLORS.brake,
  }));

  const bottom = OFFSETS.brake.bottom + insets.bottom;

  return (
    <View style={styles.overlay} testID="tilt-controls">
      <GestureDetector gesture={gestures.left}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Frenar o retroceder, lado izquierdo"
          style={[styles.brake, { left: OFFSETS.brake.side + insets.left, bottom }, leftStyle]}
        >
          <Text style={styles.brakeLabel}>Freno</Text>
        </Animated.View>
      </GestureDetector>
      <GestureDetector gesture={gestures.right}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Frenar o retroceder, lado derecho"
          style={[styles.brake, { right: OFFSETS.brake.side + insets.right, bottom }, rightStyle]}
        >
          <Text style={styles.brakeLabel}>Freno</Text>
        </Animated.View>
      </GestureDetector>
      <View style={[styles.indicatorRow, { bottom: OFFSETS.indicator.bottom + insets.bottom }]}>
        <SteeringIndicator output={tilt.output} config={config} />
      </View>
    </View>
  );
}
