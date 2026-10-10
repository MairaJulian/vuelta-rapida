import { Text, View } from 'react-native';

import { getCarColor } from '@/core/CarPalette';

import { styles } from './DriverBadge.styles';
import type { DriverBadgeProps } from './DriverBadge.types';

/**
 * Píldora del piloto (handoff, pantalla 04): el número en un círculo del color del auto
 * y el NOMBRE, sobre tinta. El número va en blanco sobre los colores oscuros y en tinta
 * sobre los claros.
 */
export function DriverBadge({ name, number, colorId, trailing, style, testID }: DriverBadgeProps) {
  const color = getCarColor(colorId);
  return (
    <View style={[styles.badge, style]} testID={testID}>
      <View style={[styles.circle, { backgroundColor: color.hex }]}>
        <Text style={[styles.number, { color: color.numberColor }]}>{number}</Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      {trailing}
    </View>
  );
}
