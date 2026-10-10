import type { Profile, ProfileDraft, ProfileResult, ProfilesState } from '@/core/Profiles';

export interface UseProfilesResult {
  /** Perfiles, perfil activo y récords. Todas las pantallas montadas ven el mismo valor. */
  state: ProfilesState;
  /** Los perfiles, en el orden en que se crearon. */
  profiles: Profile[];
  /** Quién está jugando; `null` antes de elegir. */
  activeProfile: Profile | null;
  /** Crea un perfil, lo deja activo y lo guarda. Si hay errores, no cambia nada. */
  createProfile: (draft: ProfileDraft) => ProfileResult;
  /** Cambia nombre, color y número de un perfil y lo guarda. */
  updateProfile: (id: string, draft: ProfileDraft) => ProfileResult;
  /** Borra un perfil y sus récords. */
  deleteProfile: (id: string) => void;
  /** Elige quién juega. */
  selectProfile: (id: string) => void;
}
