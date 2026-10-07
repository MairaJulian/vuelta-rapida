import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { FEATURE_FLAGS } from '@/core/FeatureFlags';
import { getStartStep, isControlModeAvailable } from '@/core/PlayerPreferences';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';

import { START_HREFS } from './StartScreen.styles';
import type { StartScreenProps } from './StartScreen.types';

/**
 * Entrada del juego: no dibuja nada, decide a dónde ir con las preferencias
 * guardadas. Con la inclinación activada: la primera vez, a elegir el control; con
 * inclinación sin calibrar, a la calibración; si no, a la pista. Con la inclinación
 * desactivada (`FEATURE_FLAGS.tiltControl`), siempre a la pista con botones: si había
 * inclinación guardada, primero la cambia a botones. La lectura es síncrona: no hay
 * pantalla de carga.
 */
export function StartScreen({ tiltEnabled = FEATURE_FLAGS.tiltControl }: StartScreenProps) {
  const { preferences, updatePreferences } = usePlayerPreferences();
  const mustSwitchToButtons = !isControlModeAvailable(preferences.controlMode, tiltEnabled);

  useEffect(() => {
    if (mustSwitchToButtons) {
      updatePreferences({ controlMode: 'buttons' });
    }
  }, [mustSwitchToButtons, updatePreferences]);

  // Espera a que el cambio se guarde, para que la pista no arranque un cuadro con inclinación.
  if (mustSwitchToButtons) {
    return null;
  }
  return <Redirect href={START_HREFS[getStartStep(preferences, tiltEnabled)]} />;
}
