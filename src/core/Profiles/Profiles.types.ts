import type { CarColorId } from '@/core/CarPalette';
import type { GhostRecording } from '@/core/Ghost';

/** Un jugador del celular compartido, con su auto. Serializable. */
export interface Profile {
  /** Identificador estable: los récords se asocian por acá, no por el nombre. */
  id: string;
  /** Nombre ya normalizado (sin espacios sobrantes), de 1 a 12 caracteres. */
  name: string;
  /** Color del auto, por `id` de la paleta (`core/CarPalette`). */
  colorId: CarColorId;
  /** Número del auto, de 1 a 99. */
  number: number;
  /** Fecha de creación, en milisegundos desde 1970. */
  createdAt: number;
}

/** Lo que el jugador elige al crear o editar un perfil. */
export interface ProfileDraft {
  name: string;
  colorId: CarColorId;
  number: number;
}

/** Mejor vuelta de un perfil en un circuito. Hay uno por perfil y circuito. */
export interface LapRecord {
  profileId: string;
  circuitId: string;
  /** Tiempo, en milisegundos. */
  lapMs: number;
  /** Cuándo se marcó, en milisegundos desde 1970: desempata el ranking. */
  setAt: number;
}

/**
 * Mejor carrera completa de un perfil en un circuito con una cantidad de vueltas. Hay
 * uno por perfil, circuito y cantidad de vueltas.
 */
export interface RaceRecord {
  profileId: string;
  circuitId: string;
  /** Vueltas de la carrera: cada cantidad es una tabla aparte. */
  laps: number;
  /** Tiempo total, en milisegundos. */
  totalMs: number;
  /** Cuándo se marcó, en milisegundos desde 1970: desempata el ranking. */
  setAt: number;
}

/**
 * Fantasma de un perfil en un circuito: la grabación de su mejor vuelta. Hay uno por perfil
 * y circuito, el de la vuelta más rápida que se grabó.
 */
export interface GhostEntry {
  profileId: string;
  circuitId: string;
  /** Cuándo se grabó, en milisegundos desde 1970. */
  setAt: number;
  recording: GhostRecording;
}

/** Perfiles, perfil activo y récords: el documento `profiles` de los datos guardados. */
export interface ProfilesState {
  profiles: Profile[];
  /** Quién está jugando; `null` antes de elegir o si se borró. */
  activeProfileId: string | null;
  /** Mejores vueltas: la tabla "Mejor vuelta" del ranking. */
  lapRecords: LapRecord[];
  /** Mejores carreras completas: las tablas "Carrera" del ranking, por cantidad de vueltas. */
  raceRecords: RaceRecord[];
  /** Fantasmas: la grabación de la mejor vuelta de cada perfil en cada circuito. */
  ghosts: GhostEntry[];
  /**
   * Récords sin dueño por `id` de circuito: los de antes de los perfiles (y los que se
   * marquen sin perfil activo). Pasan al primer perfil que se cree.
   */
  unassignedRecords: Readonly<Record<string, number>>;
}

/** Por qué no se puede guardar un perfil. */
export type ProfileError =
  | 'name-empty'
  | 'name-too-long'
  | 'name-taken'
  | 'number-out-of-range'
  | 'color-unknown'
  | 'profile-missing';

/** Resultado de crear o editar: el estado nuevo y el perfil, o los errores. */
export type ProfileResult =
  { ok: true; state: ProfilesState; profile: Profile } | { ok: false; errors: ProfileError[] };
