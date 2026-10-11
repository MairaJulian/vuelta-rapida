import type { SkImage, Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { CameraView } from '@/core/Camera';
import type { CarState } from '@/core/DrivingModel';
import type { ParticleState } from '@/core/Particles';
import type { Scenery } from '@/core/Scenery';
import type { SceneryDisplayConfig } from '@/core/SceneryView';
import type { TrackData } from '@/core/Track';
import type { RaceGhostView } from '@/hooks/useRaceGhost';
import type { UseSceneryViewResult } from '@/hooks/useSceneryView';

/** Los rivales a dibujar: dónde está cada uno (`useRaceLoop`) y quién es (`createRivalRoster`). */
export interface RivalsView {
  /** Autos rivales en el orden de la grilla (`rivalCars` de `useRaceLoop`). */
  cars: SharedValue<CarState[]>;
  /** Cámara actual, para dejar los nombres derechos (`cameraView` de `useRaceLoop`). */
  cameraView: SharedValue<CameraView>;
  /** Nombre y color de cada rival, en el mismo orden que `cars`. */
  drivers: { id: string; name: string; color: string }[];
}

export interface DriveCanvasProps {
  /** Circuito a dibujar. Si trae escenografía (`scenery`), se dibuja también. */
  track: TrackData & { scenery?: Scenery };
  /** Transformación de la cámara (de `useRaceLoop`). */
  cameraTransform: SharedValue<Transforms3d>;
  /** Posición y rumbo del auto en el mundo (de `useRaceLoop`). */
  carTransform: SharedValue<Transforms3d>;
  /** Árboles visibles y paralaje (de `useSceneryView`). Sin esto no hay escenografía. */
  sceneryView?: UseSceneryViewResult;
  /** Textura de árboles, sombras y partículas (de `useSceneryAtlas`). */
  atlas?: SkImage | null;
  /** Partículas de polvo y humo (de `useParticles`). */
  particles?: SharedValue<ParticleState>;
  /** Qué se muestra y con qué intensidad (panel de desarrollo). */
  display?: SceneryDisplayConfig;
  /** Color de la carrocería del auto (el del perfil activo). Por defecto, el azul. */
  carColor?: string;
  /** Número del auto (el del perfil activo); sin número, el disco queda vacío. */
  carNumber?: number | null;
  /** Auto fantasma (`useRaceGhost`): se dibuja debajo del auto del jugador. Sin esto, no hay fantasma. */
  ghost?: RaceGhostView | null;
  /** Rivales con IA: se dibujan sobre el fantasma y debajo del auto del jugador. Sin esto, el jugador corre solo. */
  rivals?: RivalsView | null;
}
