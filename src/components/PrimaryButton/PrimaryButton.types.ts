export interface PrimaryButtonProps {
  /** Texto del botón, por ejemplo "Seguir" o "Listo". */
  label: string;
  onPress: () => void;
  /** Alto en dp: 52 en general, 56 para Listo y Continuar (handoff). */
  height?: 52 | 56;
  /** Deshabilitado: no responde y se ve atenuado. */
  disabled?: boolean;
  testID?: string;
}
