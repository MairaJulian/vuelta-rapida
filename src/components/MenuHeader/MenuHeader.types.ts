import type { ReactNode } from 'react';

export interface MenuHeaderProps {
  /** Título de la pantalla; se muestra en mayúsculas. */
  title: string;
  /** Texto chico debajo del título, por ejemplo "Paso 1 de 2". */
  subtitle?: string;
  /** Si se pasa, muestra el botón Volver a la izquierda. */
  onBack?: () => void;
  /** Botón principal de la pantalla, a la derecha. */
  action?: ReactNode;
}
