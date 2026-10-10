import type { StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '@/components/Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Etiqueta para el lector de pantalla (el botón no tiene texto). */
  label: string;
  onPress: () => void;
  /** Diámetro en dp: 48 en general, 56 en Inicio (handoff). */
  size?: 48 | 56;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
