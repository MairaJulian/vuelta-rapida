import type { ComponentType } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import type { DrivingInput } from '@/core/DrivingModel';

/** Modos de control que puede elegir el jugador. */
export type InputMode = 'buttons' | 'tilt';

/**
 * Contrato común de todos los modos de entrada.
 * Cada modo es un componente que dibuja sus controles en pantalla (si los tiene)
 * y escribe la entrada en `input`. La simulación lee ese valor en cada cuadro.
 */
export interface InputControlsProps {
  /** Entrada actual. Se escribe desde el hilo de UI y la lee el loop de la simulación. */
  input: SharedValue<DrivingInput>;
}

/** Componente que implementa un modo de entrada. */
export type InputControlsComponent = ComponentType<InputControlsProps>;
