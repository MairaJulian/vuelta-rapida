import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { DrivingInput } from '@/core/DrivingModel';
import { NEUTRAL_INPUT } from '@/input/InputControls';

import { COLORS, styles } from './ButtonControls.styles';
import type { ButtonControlsProps, ControlButton, PressedButtons } from './ButtonControls.types';

const RELEASED: PressedButtons = { left: false, right: false, brake: false };

/** Traduce los botones presionados a la entrada abstracta. Izquierda y derecha juntas se anulan. */
export function buttonsToInput(pressed: PressedButtons): DrivingInput {
  'worklet';
  return {
    steer: (pressed.right ? 1 : 0) - (pressed.left ? 1 : 0),
    brake: pressed.brake ? 1 : 0,
  };
}

function vibrateOnBrake() {
  // Algunos equipos no tienen motor de vibración: no es un error.
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Gesto de "mantener presionado": empieza al apoyar el dedo y termina al levantarlo. */
function createHoldGesture(testId: string, onChange: (isDown: boolean) => void) {
  return Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      'worklet';
      onChange(true);
    })
    .onFinalize(() => {
      'worklet';
      onChange(false);
    })
    .withTestId(testId);
}

/**
 * Modo de control con botones en pantalla: izquierda, derecha y freno.
 * Cada botón tiene su propio gesto, así que funcionan con dedos distintos a la vez
 * (por ejemplo, frenar y doblar). Los gestos corren en el hilo de UI y escriben
 * la entrada directamente, sin pasar por React.
 */
export function ButtonControls({ input }: ButtonControlsProps) {
  const pressed = useSharedValue<PressedButtons>(RELEASED);

  const gestures = useMemo(() => {
    const setButton = (button: ControlButton, isDown: boolean) => {
      'worklet';
      const current = pressed.get();
      const next = { ...current, [button]: isDown };
      pressed.set(next);
      input.set(buttonsToInput(next));
      if (button === 'brake' && isDown && !current.brake) {
        scheduleOnRN(vibrateOnBrake);
      }
    };
    return {
      left: createHoldGesture('button-left', (isDown) => {
        'worklet';
        setButton('left', isDown);
      }),
      right: createHoldGesture('button-right', (isDown) => {
        'worklet';
        setButton('right', isDown);
      }),
      brake: createHoldGesture('button-brake', (isDown) => {
        'worklet';
        setButton('brake', isDown);
      }),
    };
  }, [input, pressed]);

  // Si el modo de control se desmonta con un botón apretado, el auto no debe quedar frenando.
  useEffect(() => () => input.set(NEUTRAL_INPUT), [input]);

  const leftStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get().left ? COLORS.steerPressed : COLORS.steer,
  }));
  const rightStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get().right ? COLORS.steerPressed : COLORS.steer,
  }));
  const brakeStyle = useAnimatedStyle(() => ({
    backgroundColor: pressed.get().brake ? COLORS.brakePressed : COLORS.brake,
  }));

  return (
    <View style={styles.overlay} testID="button-controls">
      <View style={styles.steerGroup}>
        <GestureDetector gesture={gestures.left}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel="Doblar a la izquierda"
            style={[styles.steerButton, leftStyle]}
          >
            <View style={styles.arrowLeft} />
          </Animated.View>
        </GestureDetector>
        <GestureDetector gesture={gestures.right}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel="Doblar a la derecha"
            style={[styles.steerButton, rightStyle]}
          >
            <View style={styles.arrowRight} />
          </Animated.View>
        </GestureDetector>
      </View>
      <GestureDetector gesture={gestures.brake}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel="Frenar"
          style={[styles.brakeButton, brakeStyle]}
        >
          <Text style={styles.brakeLabel}>Freno</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
