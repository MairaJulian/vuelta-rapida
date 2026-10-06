import type { TrackData } from '@/core/Track';

export interface TrackLayerProps {
  /** Circuito a dibujar, en metros. Se dibuja en coordenadas del mundo (dentro del grupo de la cámara). */
  track: TrackData;
}
