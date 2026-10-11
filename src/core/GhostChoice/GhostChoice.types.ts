import type { GhostRecording } from '@/core/Ghost';
import type { Profile } from '@/core/Profiles';

/** El fantasma que va a correr: de quién es y su grabación. */
export interface ResolvedGhost {
  /** Dueño del fantasma, con su nombre y su color actuales. */
  profile: Profile;
  recording: GhostRecording;
}

/** Qué fantasmas existen en una pista: una opción sin fantasma se muestra desactivada. */
export interface GhostAvailability {
  /** La mejor vuelta del perfil activo: existe si ya grabó una vuelta en la pista. */
  mine: boolean;
  /** El récord de la pista: existe si quien lo tiene grabó esa vuelta. */
  record: boolean;
  /** Sin fantasma: siempre se puede. */
  none: true;
}
