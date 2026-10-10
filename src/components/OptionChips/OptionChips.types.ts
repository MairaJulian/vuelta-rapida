export interface OptionChip<Value extends string> {
  value: Value;
  label: string;
}

export interface OptionChipsProps<Value extends string> {
  options: readonly OptionChip<Value>[];
  /** Opción elegida. */
  value: Value;
  onChange: (value: Value) => void;
  /** Nombre del grupo para el lector de pantalla. */
  label: string;
  testID?: string;
}
