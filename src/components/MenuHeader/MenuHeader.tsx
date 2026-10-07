import { Pressable, Text, View } from 'react-native';

import { styles } from './MenuHeader.styles';
import type { MenuHeaderProps } from './MenuHeader.types';

/**
 * Encabezado de los menús (pantallas 02 a 05 del handoff): botón Volver a la
 * izquierda, título y subtítulo al centro y el botón principal a la derecha.
 */
export function MenuHeader({ title, subtitle, onBack, action }: MenuHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          style={styles.back}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
      ) : null}
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}
