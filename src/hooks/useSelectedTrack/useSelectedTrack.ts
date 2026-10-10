import { useSyncExternalStore } from 'react';

import { getCircuit } from '@/core/Circuits';

import type { UseSelectedTrackResult } from './useSelectedTrack.types';

let selectedId = getCircuit(null).id;
const listeners = new Set<() => void>();

/** Lectura síncrona de la pista elegida (para valores iniciales de estado). */
export function readSelectedTrack(): string {
  return selectedId;
}

/** Elige la pista y avisa a las pantallas que la usan. Un id que no existe elige la primera. */
export function selectTrack(circuitId: string): void {
  const next = getCircuit(circuitId).id;
  if (next === selectedId) {
    return;
  }
  selectedId = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * La pista elegida en esta sesión. La elige la selección de pista y la fija la
 * carrera al abrirse; el ranking abre en ella. Vive en memoria: al cerrar el juego,
 * vuelve a la primera pista (no es un dato del jugador, así que no se guarda).
 */
export function useSelectedTrack(): UseSelectedTrackResult {
  const circuitId = useSyncExternalStore(subscribe, readSelectedTrack, readSelectedTrack);
  return { circuitId, select: selectTrack };
}
