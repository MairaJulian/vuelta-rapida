import { Fill, LinearGradient, mixColors, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { COLORS, STRIPE_WIDTH } from './GrassLayer.styles';
import type { GrassLayerProps } from './GrassLayer.types';

/**
 * Pasto con franjas de corte que alternan dos verdes. Va dentro del grupo de la
 * cámara: las franjas quedan fijas en el mundo, se mueven con él y nunca se acaban.
 */
export const GrassLayer = memo(function GrassLayer({ angle, contrast }: GrassLayerProps) {
  const stripe = useMemo(() => mixColors(contrast, COLORS.grass, COLORS.stripe), [contrast]);
  // El gradiente avanza a lo ancho de las franjas: hacia la derecha de su rumbo.
  const end = vec(Math.cos(angle) * STRIPE_WIDTH * 2, Math.sin(angle) * STRIPE_WIDTH * 2);
  return (
    <Fill>
      <LinearGradient
        start={vec(0, 0)}
        end={end}
        colors={[COLORS.grass, COLORS.grass, stripe, stripe]}
        positions={[0, 0.5, 0.5, 1]}
        mode="repeat"
      />
    </Fill>
  );
});
