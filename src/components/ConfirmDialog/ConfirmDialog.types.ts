import type { IconName } from '@/components/Icon';

export interface ConfirmDialogProps {
  /** Si se muestra. */
  visible: boolean;
  /** Pregunta, por ejemplo "¿Borrar a MALE?". */
  title: string;
  /** Qué pasa si se confirma. */
  message: string;
  /** Texto del botón que confirma, por ejemplo "Borrar". */
  confirmLabel: string;
  /** Ícono del botón que confirma. */
  confirmIcon?: IconName;
  /** Texto del botón que cancela. Por defecto, "Cancelar". */
  cancelLabel?: string;
  onConfirm: () => void;
  /** Cancelar, tocar el velo o el botón Atrás de Android. */
  onCancel: () => void;
}
