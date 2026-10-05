import { useMemo, useState } from 'react';
import type { AccessibilityActionEvent, LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { styles, THUMB_SIZE } from './DevSlider.styles';
import type { DevSliderProps } from './DevSlider.types';

/** Redondea al paso y quita el ruido de coma flotante (0.1 + 0.2 = 0.30000000000000004). */
function snap(value: number, min: number, max: number, step: number): number {
  const stepped = step > 0 ? min + Math.round((value - min) / step) * step : value;
  return Number(Math.min(Math.max(stepped, min), max).toFixed(6));
}

/** Convierte una fracción del recorrido (0 a 1) en valor, redondeado al paso. */
export function ratioToValue(ratio: number, min: number, max: number, step: number): number {
  const clamped = Math.min(Math.max(ratio, 0), 1);
  return snap(min + clamped * (max - min), min, max, step);
}

/** Fracción del recorrido (0 a 1) que corresponde a un valor. */
export function valueToRatio(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  return Math.min(Math.max((value - min) / (max - min), 0), 1);
}

/**
 * Control deslizante simple para el panel de desarrollo. Arrastrar en horizontal
 * cambia el valor; arrastrar en vertical se deja pasar para que el panel haga scroll.
 * Hecho con gesture-handler para no sumar una dependencia nativa solo para desarrollo.
 */
export function DevSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = String,
  testID,
}: DevSliderProps) {
  const [width, setWidth] = useState(0);

  // Se reconstruye cuando cambia el valor; gesture-handler conserva el gesto nativo
  // (mismo tipo) y solo actualiza los callbacks, así que el arrastre no se corta.
  const gesture = useMemo(() => {
    const update = (x: number) => {
      if (width <= 0) {
        return;
      }
      const next = ratioToValue(x / width, min, max, step);
      if (next !== value) {
        onChange(next);
      }
    };
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-4, 4])
      .failOffsetY([-12, 12])
      .onStart((event) => update(event.x))
      .onUpdate((event) => update(event.x))
      .withTestId(`${testID ?? label}-gesture`);
  }, [label, max, min, onChange, step, testID, value, width]);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const delta = event.nativeEvent.actionName === 'increment' ? step : -step;
    const next = snap(value + delta, min, max, step);
    if (next !== value) {
      onChange(next);
    }
  };

  const offset = valueToRatio(value, min, max) * width;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{formatValue(value)}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.touchArea}
          onLayout={onLayout}
          testID={testID ? `${testID}-track` : undefined}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View style={styles.track} />
          <View style={[styles.fill, { width: offset }]} />
          <View style={[styles.thumb, { left: offset - THUMB_SIZE / 2 }]} />
        </View>
      </GestureDetector>
    </View>
  );
}
