import { Pressable, Text, View } from 'react-native';

import { COLORS, styles } from './OptionChips.styles';
import type { OptionChipsProps } from './OptionChips.types';

/** Fondo de la píldora: [suelta, presionada]. */
const BACKGROUNDS = {
  selected: [COLORS.blue, COLORS.bluePressed],
  idle: [COLORS.card, COLORS.pressed],
} as const;

/**
 * Elegir una opción entre varias: píldoras blancas, y la elegida en azul. Se anuncian
 * como un grupo de radios. Si no entran en una fila, pasan a la siguiente. Una opción
 * desactivada se ve apagada y no responde (si era la elegida, sigue marcada).
 */
export function OptionChips<Value extends string>({
  options,
  value,
  onChange,
  label,
  testID,
}: OptionChipsProps<Value>) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={option.disabled}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={
              option.disabled ? { checked: selected, disabled: true } : { checked: selected }
            }
            style={({ pressed }) => [
              styles.chip,
              { backgroundColor: BACKGROUNDS[selected ? 'selected' : 'idle'][pressed ? 1 : 0] },
              option.disabled ? styles.disabled : null,
            ]}
          >
            <Text style={[styles.label, { color: selected ? COLORS.white : COLORS.ink }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
