import { Pressable, Text, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { getCarColor } from '@/core/CarPalette';
import { formatLapTime } from '@/core/LapTimer';
import { CarPreview, SIDEWAYS } from '@/render/CarPreview';

import { COLORS, LAYOUT, styles } from './ProfileCard.styles';
import type { ProfileCardProps } from './ProfileCard.types';

/**
 * Tarjeta de un perfil en "¿Quién juega?": el auto de costado con su color y su número,
 * el NOMBRE y el récord. Tocarla elige al jugador; el lápiz edita.
 */
export function ProfileCard({ profile, recordMs, highlighted, onPress, onEdit }: ProfileCardProps) {
  const name = profile.name.toUpperCase();
  const color = getCarColor(profile.colorId);
  const record = recordMs === null ? null : formatLapTime(recordMs);
  const recordText = record ? `Récord ${record}` : 'Sin récord todavía';
  return (
    <View style={styles.wrapper}>
      <Pressable
        testID={`profile-card-${profile.id}`}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, número ${profile.number}. ${recordText}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? COLORS.soft : COLORS.card,
            borderColor: highlighted ? COLORS.blue : 'transparent',
          },
        ]}
      >
        <View style={styles.illustration}>
          <View style={[styles.numberCircle, { backgroundColor: color.hex }]}>
            <Text style={[styles.number, { color: color.numberColor }]}>{profile.number}</Text>
          </View>
          <CarPreview
            bodyColor={color.hex}
            number={profile.number}
            carWidth={LAYOUT.car.width}
            rotation={SIDEWAYS}
            width={LAYOUT.car.canvasWidth}
            height={LAYOUT.car.canvasHeight}
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
            {name}
          </Text>
          <View style={[styles.chip, { backgroundColor: record ? COLORS.lime : COLORS.soft }]}>
            <Text style={styles.chipText}>{recordText}</Text>
          </View>
        </View>
      </Pressable>
      <IconButton
        icon="pencil"
        label={`Editar a ${name}`}
        onPress={onEdit}
        style={styles.edit}
        testID={`profile-edit-${profile.id}`}
      />
    </View>
  );
}
