import { Canvas, matchFont, RoundedRect, Text } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { BOX, COLORS, FPS_LABEL, styles } from './LoopTestCanvas.styles';
import type { LoopTestCanvasProps } from './LoopTestCanvas.types';

/**
 * Dibuja el rectángulo en movimiento y el contador de fps.
 * Solo lee los valores compartidos que recibe; no contiene lógica.
 */
export function LoopTestCanvas({ x, fpsText, height }: LoopTestCanvasProps) {
  const font = useMemo(
    () => matchFont({ fontFamily: FPS_LABEL.fontFamily, fontSize: FPS_LABEL.fontSize }),
    [],
  );

  return (
    <Canvas style={styles.canvas}>
      <RoundedRect
        x={x}
        y={(height - BOX.height) / 2}
        width={BOX.width}
        height={BOX.height}
        r={BOX.radius}
        color={COLORS.box}
      />
      <Text x={FPS_LABEL.x} y={FPS_LABEL.y} text={fpsText} font={font} color={COLORS.text} />
    </Canvas>
  );
}
