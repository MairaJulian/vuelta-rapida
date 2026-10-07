import type { ControlMode } from '@/core/PlayerPreferences';

export interface ControlModeCardProps {
  /** Modo que representa la tarjeta; define la ilustración. */
  mode: ControlMode;
  /** Título, por ejemplo "Inclinación". Se muestra en mayúsculas. */
  title: string;
  description: string;
  /** Texto del chip, por ejemplo "Más real". */
  chip: string;
  selected: boolean;
  onPress: () => void;
}
