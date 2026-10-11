import type { GhostSource } from '@/core/Ghost';
import { getGhost, getProfile } from '@/core/Profiles';
import type { ProfilesState } from '@/core/Profiles';
import { getTrackRecord, LAP_TABLE } from '@/core/Ranking';

import type { GhostAvailability, ResolvedGhost } from './GhostChoice.types';

/**
 * El fantasma de una opción en una pista, o `null` si no existe todavía:
 * - `mine`: la grabación del perfil activo.
 * - `record`: la grabación de quien tiene el récord de la pista (la mejor vuelta del
 *   ranking). Si esa vuelta es de antes de los fantasmas y no tiene grabación, no hay.
 * - `none`: nunca hay.
 */
export function resolveGhost(
  state: ProfilesState,
  source: GhostSource,
  activeProfileId: string | null,
  circuitId: string,
): ResolvedGhost | null {
  const ownerId =
    source === 'mine'
      ? activeProfileId
      : source === 'record'
        ? (getTrackRecord(state, circuitId, LAP_TABLE)?.profile.id ?? null)
        : null;
  const profile = getProfile(state, ownerId);
  const ghost = profile ? getGhost(state, profile.id, circuitId) : null;
  return profile && ghost ? { profile, recording: ghost.recording } : null;
}

/** Qué opciones de fantasma tienen grabación en una pista (para activarlas o desactivarlas). */
export function getGhostAvailability(
  state: ProfilesState,
  activeProfileId: string | null,
  circuitId: string,
): GhostAvailability {
  return {
    mine: resolveGhost(state, 'mine', activeProfileId, circuitId) !== null,
    record: resolveGhost(state, 'record', activeProfileId, circuitId) !== null,
    none: true,
  };
}
