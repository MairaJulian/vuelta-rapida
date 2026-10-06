import { Pressable, Text } from 'react-native';

import { COLORS, DISABLED_OPACITY, styles } from './PrimaryButton.styles';
import type { PrimaryButtonProps } from './PrimaryButton.types';

/** Botón primario de los menús: píldora azul con texto blanco (handoff, §Componentes). */
export function PrimaryButton({
  label,
  onPress,
  height = 52,
  disabled,
  testID,
}: PrimaryButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        {
          height,
          backgroundColor: pressed ? COLORS.pressed : COLORS.background,
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
