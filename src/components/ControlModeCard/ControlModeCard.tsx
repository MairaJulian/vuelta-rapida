import { Pressable, Text, View } from 'react-native';

import { COLORS, styles, TILT_DOT_RISE } from './ControlModeCard.styles';
import type { ControlModeCardProps } from './ControlModeCard.types';

/** Ilustración del modo: celular girado (inclinación) o pantalla con botones. */
function Illustration({ mode, selected }: Pick<ControlModeCardProps, 'mode' | 'selected'>) {
  const stroke = selected ? COLORS.white : COLORS.blue;
  if (mode === 'tilt') {
    return (
      <View>
        <View style={styles.tiltDots}>
          {TILT_DOT_RISE.map((rise, index) => (
            <View
              // Los puntos son fijos y nunca cambian de orden.
              key={`dot-${index}`}
              style={[styles.tiltDot, { backgroundColor: stroke, marginTop: rise }]}
            />
          ))}
        </View>
        <View style={[styles.tiltPhone, { borderColor: stroke }]} />
      </View>
    );
  }
  return (
    <View style={[styles.buttonsScreen, { borderColor: stroke }]}>
      <View style={[styles.steerDot, { backgroundColor: stroke }]} />
      <View style={[styles.steerDot, { backgroundColor: stroke }]} />
      <View style={styles.brakeDot} />
    </View>
  );
}

/**
 * Tarjeta de opción de la elección de control (pantalla 02 del handoff): la
 * ilustración a la izquierda y, a la derecha, título, descripción y chip. La
 * elegida lleva borde azul y la ilustración en azul con trazos blancos.
 */
export function ControlModeCard({
  mode,
  title,
  description,
  chip,
  selected,
  onPress,
}: ControlModeCardProps) {
  return (
    <Pressable
      testID={`control-card-${mode}`}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      style={[styles.card, { borderColor: selected ? COLORS.blue : 'transparent' }]}
    >
      <View
        style={[styles.illustration, { backgroundColor: selected ? COLORS.blue : COLORS.blueTint }]}
      >
        <Illustration mode={mode} selected={selected} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{chip}</Text>
        </View>
      </View>
    </Pressable>
  );
}
