import {
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { getCenterlineRect, getCurves, getFinishLine } from '@/core/Track';
import type { TrackCurve } from '@/core/Track';

import {
  COLORS,
  CURB_DASH,
  CURB_RATIO,
  EDGE_RATIO,
  FINISH_SQUARE,
  GRASS_MARGIN,
  GRASS_STRIPE_PERIOD,
} from './TrackLayer.styles';
import type { TrackLayerProps } from './TrackLayer.types';

/** Semicírculo de una curva como path SVG (y crece hacia abajo, igual que z). */
function curvePath({ side, centerX, centerZ, radius }: TrackCurve): string {
  const sweep = side === 'right' ? 1 : 0;
  return `M ${centerX} ${centerZ - radius} A ${radius} ${radius} 0 0 ${sweep} ${centerX} ${centerZ + radius}`;
}

/**
 * Dibuja el óvalo en coordenadas del mundo (metros): césped con franjas, pianos en
 * las curvas, borde blanco, asfalto y línea de meta a cuadros. Es estático: la
 * cámara lo mueve desde el grupo que lo contiene.
 */
export const TrackLayer = memo(function TrackLayer({ track }: TrackLayerProps) {
  const rect = getCenterlineRect(track);
  const curves = getCurves(track);
  const finish = getFinishLine(track);

  const finishSquares = useMemo(() => {
    const columns = Math.round(finish.thickness / FINISH_SQUARE);
    const rows = Math.round(finish.length / FINISH_SQUARE);
    const left = finish.x - finish.thickness / 2;
    const top = finish.z - finish.length / 2;
    const squares: { x: number; y: number; key: string }[] = [];
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        if ((column + row) % 2 === 1) {
          squares.push({
            x: left + column * FINISH_SQUARE,
            y: top + row * FINISH_SQUARE,
            key: `${column}-${row}`,
          });
        }
      }
    }
    return squares;
  }, [finish.length, finish.thickness, finish.x, finish.z]);

  return (
    <Group>
      <Rect
        x={rect.x - GRASS_MARGIN}
        y={rect.z - GRASS_MARGIN}
        width={rect.width + GRASS_MARGIN * 2}
        height={rect.height + GRASS_MARGIN * 2}
      >
        <LinearGradient
          start={vec(0, 0)}
          end={vec(GRASS_STRIPE_PERIOD, GRASS_STRIPE_PERIOD)}
          colors={[COLORS.grass, COLORS.grass, COLORS.grassStripe, COLORS.grassStripe]}
          positions={[0, 0.5, 0.5, 1]}
          mode="repeat"
        />
      </Rect>

      {curves.map((curve) => (
        <Group key={curve.side}>
          <Path
            path={curvePath(curve)}
            style="stroke"
            strokeWidth={track.width * CURB_RATIO}
            color={COLORS.curb}
          />
          <Path
            path={curvePath(curve)}
            style="stroke"
            strokeWidth={track.width * CURB_RATIO}
            color={COLORS.curbStripe}
          >
            <DashPathEffect intervals={[CURB_DASH, CURB_DASH]} />
          </Path>
        </Group>
      ))}

      <RoundedRect
        x={rect.x}
        y={rect.z}
        width={rect.width}
        height={rect.height}
        r={rect.radius}
        style="stroke"
        strokeWidth={track.width * EDGE_RATIO}
        color={COLORS.edge}
      />
      <RoundedRect
        x={rect.x}
        y={rect.z}
        width={rect.width}
        height={rect.height}
        r={rect.radius}
        style="stroke"
        strokeWidth={track.width}
        color={COLORS.asphalt}
      />

      <Rect
        x={finish.x - finish.thickness / 2}
        y={finish.z - finish.length / 2}
        width={finish.thickness}
        height={finish.length}
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
  );
});
