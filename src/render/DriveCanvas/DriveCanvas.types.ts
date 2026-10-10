import type { SkImage, Transforms3d } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { ParticleState } from '@/core/Particles';
import type { Scenery } from '@/core/Scenery';
import type { SceneryDisplayConfig } from '@/core/SceneryView';
import type { TrackData } from '@/core/Track';
import type { UseSceneryViewResult } from '@/hooks/useSceneryView';

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
}
