import { Pressable, View } from 'react-native';

import { CAR_COLORS } from '@/core/CarPalette';

import { COLORS, styles } from './ColorSwatches.styles';
import type { ColorSwatchesProps } from './ColorSwatches.types';

/** Los 8 colores de auto (handoff, pantalla 04): muestras de Ø 48, con anillo en la elegida. */
export function ColorSwatches({ selected, onSelect }: ColorSwatchesProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {CAR_COLORS.map((color) => {
        const checked = color.id === selected;
        return (
          <Pressable
            key={color.id}
            testID={`color-${color.id}`}
            accessibilityRole="radio"
            accessibilityLabel={color.name}
            accessibilityState={{ checked }}
            onPress={() => onSelect(color.id)}
            style={[styles.swatch, { borderColor: checked ? COLORS.ring : 'transparent' }]}
          >
            <View style={[styles.fill, { backgroundColor: color.hex }]} />
          </Pressable>
        );
      })}
    </View>
  );
}
