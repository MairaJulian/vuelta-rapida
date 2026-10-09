import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';

import { CIRCLE, DISABLED_OPACITY, styles, VARIANTS } from './MenuButton.styles';
import type { MenuButtonProps } from './MenuButton.types';

/**
 * Botón de los menús con las variantes del handoff (§Componentes): primario,
 * secundario, de peligro y "Correr". Puede llevar un ícono adelante, un ícono en
 * un círculo al final o un chip a la derecha. Usa el color de "presionado" de cada
 * variante.
 */
export function MenuButton({
  label,
  onPress,
  variant,
  icon,
  circleIcon,
  trailing,
  height,
  disabled,
  accessibilityLabel,
  selected,
  style,
  testID,
}: MenuButtonProps) {
  const colors = VARIANTS[variant];
  const circle =
    circleIcon && (variant === 'primary' || variant === 'run') ? CIRCLE[variant] : null;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={selected === undefined ? 'button' : 'switch'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{
        disabled: Boolean(disabled),
        ...(selected === undefined ? {} : { checked: selected }),
      }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        circle ? styles.withCircle : !trailing && styles.centered,
        variant === 'run' && styles.run,
        {
          height: height ?? colors.height,
          backgroundColor: pressed ? colors.pressed : colors.background,
          opacity: disabled ? DISABLED_OPACITY : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} color={colors.icon} size={22} /> : null}
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant === 'run' && styles.runLabel,
          { color: colors.text },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {circle && circleIcon ? (
        <View
          style={[
            styles.circle,
            { width: circle.size, height: circle.size, backgroundColor: circle.background },
          ]}
        >
          <Icon name={circleIcon} color={circle.icon} size={circle.size * 0.45} />
        </View>
      ) : null}
    </Pressable>
  );
}
