import type { SkImage } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';

import type { ParticleState } from '@/core/Particles';

export interface ParticleLayerProps {
  /** Partículas vivas (de `useParticles`). */
  particles: SharedValue<ParticleState>;
  /** Textura de la escenografía (`useSceneryAtlas`): trae el círculo de la partícula. */
  image: SkImage | null;
  /** Lugares reservados: el máximo de partículas vivas. */
  maxParticles?: number;
}
