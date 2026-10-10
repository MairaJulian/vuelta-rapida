import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';

import { COLORS, styles } from './NewProfileCard.styles';
import type { NewProfileCardProps } from './NewProfileCard.types';

/** Última tarjeta de "¿Quién juega?": crear un piloto nuevo. Mismo tamaño que `ProfileCard`. */
export function NewProfileCard({ onPress }: NewProfileCardProps) {
  return (
    <Pressable
      testID="new-profile-card"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Nuevo piloto"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? COLORS.soft : COLORS.card },
      ]}
    >
      <View style={styles.illustration}>
        <View style={styles.circle}>
          <Icon name="userPlus" color={COLORS.white} size={28} />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>Nuevo piloto</Text>
        <Text style={styles.subtitle}>Elegí nombre, color y número</Text>
      </View>
    </Pressable>
  );
}
