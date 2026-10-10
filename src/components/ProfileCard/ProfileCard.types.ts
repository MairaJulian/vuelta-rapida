import type { Profile } from '@/core/Profiles';

export interface ProfileCardProps {
  profile: Profile;
  /** Récord del perfil en el circuito, en milisegundos; `null` si no tiene. */
  recordMs: number | null;
  /** Último en jugar: lleva el borde azul de la tarjeta elegida. */
  highlighted: boolean;
  /** Tocar la tarjeta: jugar con este perfil. */
  onPress: () => void;
  /** Botón lápiz: editar el perfil. */
  onEdit: () => void;
}
