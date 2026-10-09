import type { EventBus } from '@/core/EventBus';
import type { RaceEvent } from '@/core/RaceFlow';

import type { LABELS } from './StartLights.styles';

export interface StartLightsProps {
  /** Bus de la carrera: el semáforo sigue sus eventos. */
  bus: EventBus<RaceEvent>;
  /** Luces del semáforo. Por defecto, 5. */
  lightCount?: number;
}

/** Texto de la píldora; `null` oculta el semáforo. */
export type StartLightsLabel = keyof typeof LABELS | null;

/** Lo que muestra el semáforo. */
export interface StartLightsView {
  lightsOn: number;
  label: StartLightsLabel;
}
