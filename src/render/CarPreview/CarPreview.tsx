import { Canvas } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { CarShape } from '@/render/CarShape';
import { CAR_WIDTH_METERS } from '@/render/CarShape/CarShape.styles';

import { styles } from './CarPreview.styles';
import type { CarPreviewProps } from './CarPreview.types';

/**
 * El auto de un jugador en un menú: el mismo `CarShape` de la carrera, centrado en un
 * lienzo, con su color y su número. Es decorativo: lo describe el texto de al lado.
 */
export function CarPreview({
  bodyColor,
  number = null,
  carWidth,
  rotation = 0,
  width,
  height,
  testID,
}: CarPreviewProps) {
  const transform = useMemo(
    () => [
      { translateX: width / 2 },
      { translateY: height / 2 },
      { rotate: rotation },
      { scale: carWidth / CAR_WIDTH_METERS },
    ],
    [carWidth, height, rotation, width],
  );
  return (
    <Canvas
      testID={testID}
      style={[styles.canvas, { width, height }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <CarShape transform={transform} bodyColor={bodyColor} number={number} />
    </Canvas>
  );
}
