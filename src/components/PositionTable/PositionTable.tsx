import { Text, View } from 'react-native';

import { COLORS, styles } from './PositionTable.styles';
import type { PositionTableProps } from './PositionTable.types';

/**
 * Mini tabla de posiciones del HUD: una fila por auto, del primero al último, con el
 * puesto, el color del auto y su nombre. El jugador va resaltado.
 */
export function PositionTable({ rows }: PositionTableProps) {
  const label = rows.map((row) => `${row.place}.º ${row.player ? 'vos' : row.name}`).join(', ');
  return (
    <View testID="position-table" style={styles.table} accessible accessibilityLabel={label}>
      {rows.map((row) => (
        <View
          key={row.id}
          testID={`position-row-${row.place}`}
          style={[styles.row, row.player && { backgroundColor: COLORS.playerRow }]}
        >
          <Text style={styles.place}>{row.place}</Text>
          <View style={[styles.dot, { backgroundColor: row.color }]} />
          <Text style={styles.name} numberOfLines={1}>
            {row.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
