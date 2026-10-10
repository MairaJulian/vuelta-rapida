import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { CarColorId } from '@/core/CarPalette';

export interface DriverBadgeProps {
  /** Nombre del piloto; se muestra en mayúsculas. */
  name: string;
  number: number;
  colorId: CarColorId;
  /** Algo a la derecha del nombre, por ejemplo "Cambiar". */
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
