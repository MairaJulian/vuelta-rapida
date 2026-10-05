export interface DevSliderProps {
  /** Texto a la izquierda, por ejemplo "Agarre lateral". */
  label: string;
  /** Valor actual (controlado por el padre). */
  value: number;
  min: number;
  max: number;
  /** Paso al que se redondea el valor. */
  step: number;
  /** Se llama con el valor nuevo, ya redondeado al paso, solo cuando cambia. */
  onChange: (value: number) => void;
  /** Formato del valor mostrado. Por defecto, el número tal cual. */
  formatValue?: (value: number) => string;
  /** Identificador para tests; también nombra el gesto (`${testID}-gesture`). */
  testID?: string;
}
