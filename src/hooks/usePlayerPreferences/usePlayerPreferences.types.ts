import type { PlayerPreferences } from '@/core/PlayerPreferences';

export interface UsePlayerPreferencesResult {
  /** Preferencias actuales. Todas las pantallas montadas ven el mismo valor. */
  preferences: PlayerPreferences;
  /** Cambia algunos campos y los guarda en el momento. */
  updatePreferences: (changes: Partial<PlayerPreferences>) => void;
}
