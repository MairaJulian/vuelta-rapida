import { Pressable } from 'react-native';

import { Icon } from '@/components/Icon';

import { COLORS, ICON_SIZE, styles } from './IconButton.styles';
import type { IconButtonProps } from './IconButton.types';

/** Botón ícono del handoff: círculo blanco con sombra y un ícono tinta. */
export function IconButton({ icon, label, onPress, size = 48, style, testID }: IconButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, backgroundColor: pressed ? COLORS.pressed : COLORS.card },
        style,
      ]}
    >
      <Icon name={icon} color={COLORS.ink} size={ICON_SIZE[size]} />
    </Pressable>
  );
}
