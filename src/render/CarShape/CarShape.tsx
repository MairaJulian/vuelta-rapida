import { Circle, Group, Oval, Path, Rect, RoundedRect } from '@shopify/react-native-skia';
import { memo } from 'react';

import { CAR_SCALE, COLORS, SHAPES, VIEWBOX } from './CarShape.styles';
import type { CarShapeProps } from './CarShape.types';

/** Lleva el viewBox (40 × 90, origen arriba a la izquierda) a metros, centrado en el auto. */
const VIEWBOX_TO_METERS = [
  { scale: CAR_SCALE },
  { translateX: -VIEWBOX.width / 2 },
  { translateY: -VIEWBOX.height / 2 },
];

/**
 * Monoplaza visto desde arriba, con la silueta del handoff. Se dibuja centrado en
 * su posición y mirando hacia -z; `transform` lo ubica y lo gira cada cuadro.
 */
export const CarShape = memo(function CarShape({
  transform,
  bodyColor = COLORS.body,
}: CarShapeProps) {
  return (
    <Group transform={transform}>
      <Group transform={VIEWBOX_TO_METERS}>
        {[...SHAPES.rearTires, ...SHAPES.frontTires].map((tire) => (
          <RoundedRect key={`${tire.x}-${tire.y}`} {...tire} color={COLORS.dark} />
        ))}
        <Rect {...SHAPES.frontAxle} color={COLORS.dark} />
        <Rect {...SHAPES.rearAxle} color={COLORS.dark} />
        <Path path={SHAPES.body} color={bodyColor} />
        <Path path={SHAPES.nose} color={bodyColor} />
        <RoundedRect {...SHAPES.frontWing} color={bodyColor} />
        {SHAPES.endplates.map((plate) => (
          <Rect key={plate.x} {...plate} color={COLORS.dark} />
        ))}
        <RoundedRect {...SHAPES.rearWing} color={COLORS.dark} />
        <Oval {...SHAPES.cockpit} color={COLORS.dark} />
        <Circle {...SHAPES.helmet} color={COLORS.helmet} />
        <Path
          path={SHAPES.halo}
          style="stroke"
          strokeWidth={SHAPES.haloWidth}
          color={COLORS.dark}
        />
        <Circle {...SHAPES.numberDisc} color={COLORS.numberDisc} />
      </Group>
    </Group>
  );
});
