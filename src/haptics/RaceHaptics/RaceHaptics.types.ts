/** Intensidad de una vibración. `double` son dos golpes fuertes seguidos. */
export type HapticLevel = 'off' | 'light' | 'medium' | 'heavy' | 'double';

/** Momentos de la carrera que vibran. */
export type HapticMoment = 'kerb' | 'border' | 'start' | 'finish';

/** Intensidad de cada momento. Se ajusta en el panel de desarrollo; vale solo para la sesión. */
export type RaceHapticsConfig = Record<HapticMoment, HapticLevel>;

/** Golpe de vibración del equipo: leve, medio o fuerte. */
export type HapticImpact = 'light' | 'medium' | 'heavy';

export interface RaceHapticsOptions {
  /** Hace vibrar el equipo. Por defecto, `expo-haptics`; los tests pasan uno falso. */
  impact?: (strength: HapticImpact) => void;
}

/** Vibraciones de una carrera. */
export interface RaceHaptics {
  /** Vibra con una intensidad. `off` no hace nada. */
  pulse(level: HapticLevel): void;
  /** Cancela el segundo golpe pendiente de `double`. Después no vibra nada más. */
  close(): void;
}
