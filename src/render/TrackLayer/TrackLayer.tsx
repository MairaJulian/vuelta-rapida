import {
  DashPathEffect,
  Fill,
  Group,
  LinearGradient,
  matchFont,
  Path,
  Rect,
  RoundedRect,
  Text,
  vec,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { getCurveSections, getFinishLine, getFinishSign } from '@/core/Track';
import type { TrackPoint } from '@/core/Track';

import {
  COLORS,
  CURB_DASH,
  CURB_RATIO,
  EDGE_RATIO,
  FINISH_SIGN,
  FINISH_SQUARE,
  GRASS_STRIPE_PERIOD,
} from './TrackLayer.styles';
import type { TrackLayerProps } from './TrackLayer.types';

/** Puntos como path SVG abierto (y crece hacia abajo, igual que z). */
function openPath(points: TrackPoint[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.z}`).join(' ');
}

/** Fuente del cartel "META": la del sistema, en itálica negrita (el handoff usa Archivo). */
const signFont = () =>
  matchFont({
    fontFamily: 'sans-serif',
    fontSize: FINISH_SIGN.fontSize,
    fontStyle: 'italic',
    fontWeight: 'bold',
  });

/**
 * Dibuja el circuito en coordenadas del mundo (metros) a partir de sus datos:
 * césped con franjas, pianos en las curvas, borde blanco, asfalto, línea de meta
 * a cuadros y el cartel "META". Es estático: la cámara lo mueve desde el grupo que
 * lo contiene.
 */
export const TrackLayer = memo(function TrackLayer({ track }: TrackLayerProps) {
  const centerline = useMemo(() => `${openPath(track.centerline)} Z`, [track.centerline]);
  const curbs = useMemo(
    () =>
      getCurveSections(track).map((section) => ({
        key: `${section[0].x},${section[0].z}`,
        path: openPath(section),
      })),
    [track],
  );
  const finish = getFinishLine(track);
  const sign = getFinishSign(track, FINISH_SIGN.length, FINISH_SIGN.depth, FINISH_SIGN.gap);
  const font = useMemo(signFont, []);
  const textWidth = font.measureText(FINISH_SIGN.text).width;

  // Cuadros en coordenadas locales de la meta: x a lo ancho de la pista, y en el sentido de la
  // marcha. Un número entero de cuadros de cerca de FINISH_SQUARE en cada sentido.
  const finishSquares = useMemo(() => {
    const columns = Math.max(1, Math.round(finish.length / FINISH_SQUARE));
    const rows = Math.max(1, Math.round(finish.thickness / FINISH_SQUARE));
    const width = finish.length / columns;
    const height = finish.thickness / rows;
    const squares: { x: number; y: number; width: number; height: number; key: string }[] = [];
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        if ((column + row) % 2 === 1) {
          squares.push({
            x: -finish.length / 2 + column * width,
            y: -finish.thickness / 2 + row * height,
            width,
            height,
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

      {curbs.map((curb) => (
        <Group key={curb.key}>
          <Path
            path={curb.path}
            style="stroke"
            strokeWidth={track.width * CURB_RATIO}
            strokeJoin="round"
            color={COLORS.curb}
          />
          <Path
            path={curb.path}
            style="stroke"
            strokeWidth={track.width * CURB_RATIO}
            strokeJoin="round"
            color={COLORS.curbStripe}
          >
            <DashPathEffect intervals={[CURB_DASH, CURB_DASH]} />
          </Path>
        </Group>
      ))}

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
            width={square.width}
            height={square.height}
            color={COLORS.finishDark}
          />
        ))}
      </Group>

      {/* Cartel al costado, del lado de afuera del circuito, girado para leerse derecho. */}
      <Group
        transform={[{ translateX: sign.x }, { translateY: sign.z }, { rotate: sign.rotation }]}
      >
        <RoundedRect
          x={-FINISH_SIGN.length / 2}
          y={-FINISH_SIGN.depth / 2}
          width={FINISH_SIGN.length}
          height={FINISH_SIGN.depth}
          r={FINISH_SIGN.radius}
          color={COLORS.sign}
        />
        <Text
          x={-textWidth / 2}
          y={FINISH_SIGN.fontSize * 0.36}
          text={FINISH_SIGN.text}
          font={font}
          color={COLORS.signText}
        />
      </Group>
    </Group>
  );
});
