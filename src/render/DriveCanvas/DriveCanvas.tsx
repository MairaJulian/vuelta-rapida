import { Canvas, Fill, Group } from '@shopify/react-native-skia';

import { CarShape } from '@/render/CarShape';
import { TrackLayer } from '@/render/TrackLayer';

import { COLORS, styles } from './DriveCanvas.styles';
import type { DriveCanvasProps } from './DriveCanvas.types';

/**
 * Escena de manejo: fondo de césped y, dentro del grupo de la cámara, la pista y
 * el auto en coordenadas del mundo. Solo aplica transformaciones; no calcula nada.
 */
export function DriveCanvas({ track, cameraTransform, carTransform }: DriveCanvasProps) {
  return (
    <Canvas style={styles.canvas}>
      <Fill color={COLORS.background} />
      <Group transform={cameraTransform}>
        <TrackLayer track={track} />
        <CarShape transform={carTransform} />
      </Group>
    </Canvas>
  );
}
