export interface DevSegmentedOption<Value extends string> {
  value: Value;
  label: string;
}

export interface DevSegmentedProps<Value extends string> {
  /** Opciones, en orden. */
  options: readonly DevSegmentedOption<Value>[];
  /** Opción elegida. */
  value: Value;
  onChange: (value: Value) => void;
  /** Nombre del grupo para el lector de pantalla. */
  label?: string;
  /** Texto más chico, para que entren cinco opciones en el panel. */
  compact?: boolean;
  testID?: string;
}
