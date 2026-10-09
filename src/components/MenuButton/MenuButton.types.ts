import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/Icon';

/**
 * Variantes del handoff: `primary` (azul), `secondary` (blanco con sombra),
 * `danger` (sin fondo, texto coral) y `run` (el botón Correr de Inicio).
 */
export type MenuButtonVariant = 'primary' | 'secondary' | 'danger' | 'run';

export interface MenuButtonProps {
  label: string;
  onPress: () => void;
  variant: MenuButtonVariant;
  /** Ícono antes del texto. */
  icon?: IconName;
  /**
   * Ícono dentro de un círculo al final (solo `primary` y `run`): "Continuar" de la
   * Pausa y "Correr" de Inicio.
   */
  circleIcon?: IconName;
  /** Algo a la derecha del texto, por ejemplo un chip de estado. */
  trailing?: ReactNode;
  /** Alto en dp. Por defecto, el de la variante (52, 50, 50 y 64). */
  height?: number;
  disabled?: boolean;
  /** Etiqueta para el lector de pantalla. Por defecto, `label`. */
  accessibilityLabel?: string;
  /** Para botones que se prenden y apagan. */
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
