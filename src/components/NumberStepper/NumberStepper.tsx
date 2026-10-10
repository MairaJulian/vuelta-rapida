import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import { stepCarNumber } from '@/core/Profiles';

import { COLORS, styles } from './NumberStepper.styles';
import type { NumberStepperProps } from './NumberStepper.types';

/** Botón − o + del paso numérico: círculo `soft` de Ø 48. */
function StepButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? COLORS.buttonPressed : COLORS.button },
      ]}
    >
      <Icon name={icon} color={COLORS.ink} size={20} />
    </Pressable>
  );
}

/**
 * Paso numérico del handoff (pantalla 04): píldora blanca con − y + a los costados del
 * número. De 1 a 99, dando la vuelta en los extremos (regla de `core/Profiles`).
 */
export function NumberStepper({ value, onChange }: NumberStepperProps) {
  return (
    <View style={styles.pill}>
      <StepButton label="Restar" icon="minus" onPress={() => onChange(stepCarNumber(value, -1))} />
      <Text style={styles.value} testID="number-value" accessibilityLabel={`Número ${value}`}>
        {value}
      </Text>
      <StepButton label="Sumar" icon="plus" onPress={() => onChange(stepCarNumber(value, 1))} />
    </View>
  );
}
