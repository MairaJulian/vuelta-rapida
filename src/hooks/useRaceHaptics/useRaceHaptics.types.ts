import type { EventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';
import type { RaceHaptics, RaceHapticsConfig } from '@/haptics/RaceHaptics';

export interface UseRaceHapticsParams {
  /** Bus de la carrera: cada evento vibra según `config`. */
  bus: EventBus<RaceEvent>;
  /** Preferencia del jugador: sin vibración, nada vibra. */
  enabled: boolean;
  /** Intensidad de cada momento. Se puede cambiar en caliente. */
  config: RaceHapticsConfig;
  /** Crea las vibraciones. Por defecto, con `expo-haptics`; los tests pasan unas falsas. */
  createHaptics?: () => RaceHaptics;
}
