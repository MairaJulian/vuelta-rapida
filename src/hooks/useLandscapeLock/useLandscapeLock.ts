import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';

import type { UseLandscapeLockResult } from './useLandscapeLock.types';

/**
 * Permite las dos orientaciones horizontales y ninguna vertical. En Android equivale
 * a `sensorLandscape`: la pantalla se da vuelta si el jugador da vuelta el celular.
 * `"orientation": "landscape"` de app.json fija una sola, así que se amplía al montar.
 */
export function useLandscapeLock(): UseLandscapeLockResult {
  useEffect(() => {
    // Si el equipo no lo admite, queda la orientación fija de app.json: no es un error.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => undefined);
  }, []);
}
