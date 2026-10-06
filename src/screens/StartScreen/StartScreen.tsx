import { Redirect } from 'expo-router';

import { getStartStep } from '@/core/PlayerPreferences';
import { usePlayerPreferences } from '@/hooks/usePlayerPreferences';

import { START_HREFS } from './StartScreen.styles';
import type { StartScreenProps } from './StartScreen.types';

/**
 * Entrada del juego: no dibuja nada, decide a dónde ir con las preferencias
 * guardadas. La primera vez, a elegir el control; con inclinación sin calibrar, a
 * la calibración; si no, a la pista. La lectura es síncrona: no hay pantalla de carga.
 */
export function StartScreen(_props: StartScreenProps) {
  const { preferences } = usePlayerPreferences();
  return <Redirect href={START_HREFS[getStartStep(preferences)]} />;
}
