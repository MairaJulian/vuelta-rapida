import type { InputControlsProps } from '@/input/InputControls';

export type ButtonControlsProps = InputControlsProps;

/** Qué botones están presionados en este momento. */
export interface PressedButtons {
  left: boolean;
  right: boolean;
  brake: boolean;
}

export type ControlButton = keyof PressedButtons;
