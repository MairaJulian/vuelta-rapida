import { Text, View } from 'react-native';

import { getCarColor } from '@/core/CarPalette';
import { formatLapDelta, formatLapTime } from '@/core/LapTimer';

import { COLORS, styles } from './TimingRow.styles';
import type { TimingRowProps } from './TimingRow.types';

/**
 * Fila de la torre de tiempos: puesto, barra del color del perfil, NOMBRE, número y
 * tiempo. El líder muestra su tiempo completo (y el puesto en lima); el resto, la
 * diferencia con el líder ("+0.345").
 */
export function TimingRow({ row, active }: TimingRowProps) {
  const leader = row.position === 1;
  const name = row.profile.name.toUpperCase();
  const time = leader ? formatLapTime(row.timeMs) : formatLapDelta(row.gapToLeaderMs);
  return (
    <View
      testID={`timing-row-${row.position}`}
      accessible
      accessibilityLabel={`${row.position}.º ${name}, número ${row.profile.number}, ${time}${active ? ', vos' : ''}`}
      style={[
        styles.row,
        {
          backgroundColor: active ? COLORS.blueSoft : COLORS.card,
          borderColor: active ? COLORS.blue : 'transparent',
        },
      ]}
    >
      <View style={[styles.position, leader && styles.leader]}>
        <Text style={styles.positionText}>{row.position}</Text>
      </View>
      <View
        style={[styles.bar, { backgroundColor: getCarColor(row.profile.colorId).hex }]}
        testID="timing-row-bar"
      />
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.number}>#{row.profile.number}</Text>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}
