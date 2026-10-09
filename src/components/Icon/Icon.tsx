import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { memo } from 'react';

import { DEFAULT_ICON_SIZE, ICON_PATHS, ICON_VIEWBOX, styles } from './Icon.styles';
import type { IconProps } from './Icon.types';

/**
 * Ícono de Phosphor (peso fill, como pide el handoff) dibujado con Skia. Es
 * decorativo: la etiqueta de accesibilidad la lleva el botón que lo contiene.
 */
export const Icon = memo(function Icon({
  name,
  color,
  size = DEFAULT_ICON_SIZE,
  testID,
}: IconProps) {
  return (
    <Canvas
      testID={testID}
      style={[styles.canvas, { width: size, height: size }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Group transform={[{ scale: size / ICON_VIEWBOX }]}>
        <Path path={ICON_PATHS[name]} color={color} />
      </Group>
    </Canvas>
  );
});
