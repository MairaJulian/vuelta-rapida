import { Pressable, Text, View } from 'react-native';

import { styles } from './DevSegmented.styles';
import type { DevSegmentedProps } from './DevSegmented.types';

/**
 * Selector de una opción entre varias, en una píldora (panel de desarrollo). Se
 * anuncia como un grupo de radios.
 */
export function DevSegmented<Value extends string>({
  options,
  value,
  onChange,
  label,
  compact = false,
  testID,
}: DevSegmentedProps<Value>) {
  return (
    <View
      style={styles.segmented}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.segment,
              compact && styles.segmentCompact,
              selected && styles.segmentSelected,
            ]}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                styles.segmentText,
                compact && styles.segmentTextCompact,
                selected && styles.segmentTextSelected,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
