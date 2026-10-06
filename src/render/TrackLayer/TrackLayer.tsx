import { Fill, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { getFinishLine } from '@/core/Track';
import type { TrackPoint } from '@/core/Track';

import { COLORS, EDGE_RATIO, FINISH_SQUARE, GRASS_STRIPE_PERIOD } from './TrackLayer.styles';
import type { TrackLayerProps } from './TrackLayer.types';

/** Trazado cerrado como path SVG (y crece hacia abajo, igual que z). */
function closedPath(points: TrackPoint[]): string {
  return `${points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.z}`).join(' ')} Z`;
}

/**
 * Dibuja el circuito en coordenadas del mundo (metros) a partir de sus datos:
 * césped con franjas, borde blanco, asfalto y línea de meta a cuadros. Es
 * estático: la cámara lo mueve desde el grupo que lo contiene.
 */
export const TrackLayer = memo(function TrackLayer({ track }: TrackLayerProps) {
  const centerline = useMemo(() => closedPath(track.centerline), [track.centerline]);
  const finish = getFinishLine(track);

  // Cuadros en coordenadas locales de la meta: x a lo ancho de la pista, y en el sentido de la marcha.
  const finishSquares = useMemo(() => {
    const columns = Math.round(finish.length / FINISH_SQUARE);
    const rows = Math.round(finish.thickness / FINISH_SQUARE);
    const squares: { x: number; y: number; key: string }[] = [];
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        if ((column + row) % 2 === 1) {
          squares.push({
            x: -finish.length / 2 + column * FINISH_SQUARE,
            y: -finish.thickness / 2 + row * FINISH_SQUARE,
            key: `${column}-${row}`,
          });
        }
      }
    }
    return squares;
  }, [finish.length, finish.thickness]);

  return (
    <Group>
      {/* Fill pinta todo el lienzo; el gradiente sigue la transformación de la cámara,
          así que las franjas quedan fijas en el mundo y no se acaban nunca. */}
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(GRASS_STRIPE_PERIOD, GRASS_STRIPE_PERIOD)}
          colors={[COLORS.grass, COLORS.grass, COLORS.grassStripe, COLORS.grassStripe]}
          positions={[0, 0.5, 0.5, 1]}
          mode="repeat"
        />
      </Fill>

      {/* Trazo con juntas redondeadas: cubre exactamente los puntos a menos de medio
          ancho del trazado, la misma zona que usa el límite de pista. */}
      <Path
        path={centerline}
        style="stroke"
        strokeWidth={track.width * EDGE_RATIO}
        strokeJoin="round"
        color={COLORS.edge}
      />
      <Path
        path={centerline}
        style="stroke"
        strokeWidth={track.width}
        strokeJoin="round"
        color={COLORS.asphalt}
      />

      <Group
        transform={[{ translateX: finish.x }, { translateY: finish.z }, { rotate: finish.heading }]}
      >
        <Rect
          x={-finish.length / 2}
          y={-finish.thickness / 2}
          width={finish.length}
          height={finish.thickness}
          color={COLORS.finishLight}
        />
        {finishSquares.map((square) => (
          <Rect
            key={square.key}
            x={square.x}
            y={square.y}
            width={FINISH_SQUARE}
            height={FINISH_SQUARE}
            color={COLORS.finishDark}
          />
        ))}
      </Group>
    </Group>
  );
});
