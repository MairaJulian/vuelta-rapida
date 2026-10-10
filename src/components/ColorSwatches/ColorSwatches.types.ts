import type { CarColorId } from '@/core/CarPalette';

export interface ColorSwatchesProps {
  /** Color elegido. */
  selected: CarColorId;
  onSelect: (id: CarColorId) => void;
}
