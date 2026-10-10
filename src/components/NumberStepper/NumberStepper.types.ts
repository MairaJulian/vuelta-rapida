export interface NumberStepperProps {
  /** Número del auto, de 1 a 99. */
  value: number;
  /** Recibe el número siguiente o el anterior: da la vuelta en los extremos. */
  onChange: (value: number) => void;
}
