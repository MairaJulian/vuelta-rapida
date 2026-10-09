import type { ICON_PATHS } from './Icon.styles';

/** Íconos disponibles (Phosphor, peso fill). */
export type IconName = keyof typeof ICON_PATHS;

export interface IconProps {
  name: IconName;
  /** Color del ícono. */
  color: string;
  /** Lado, en dp. Por defecto, 24. */
  size?: number;
  testID?: string;
}
