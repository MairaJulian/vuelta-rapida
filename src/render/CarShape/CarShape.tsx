import {
  Circle,
  Group,
  matchFont,
  Oval,
  Path,
  Rect,
  RoundedRect,
  Text,
} from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { CAR_SCALE, COLORS, NUMBER_TEXT, SHAPES, VIEWBOX } from './CarShape.styles';
import type { CarShapeProps } from './CarShape.types';

/** Lleva el viewBox (40 × 90, origen arriba a la izquierda) a metros, centrado en el auto. */
const VIEWBOX_TO_METERS = [
  { scale: CAR_SCALE },
  { translateX: -VIEWBOX.width / 2 },
  { translateY: -VIEWBOX.height / 2 },
];

/** Fuente del número: la del sistema, en itálica negrita (el handoff usa una serif). */
const numberFont = () =>
  matchFont({
    fontFamily: NUMBER_TEXT.fontFamily,
    fontSize: NUMBER_TEXT.fontSize,
    fontStyle: 'italic',
    fontWeight: 'bold',
  });

/**
 * Monoplaza visto desde arriba, con la silueta del handoff. Se dibuja centrado en
 * su posición y mirando hacia -z; `transform` lo ubica y lo gira cada cuadro.
 *
 * Es el único asset del auto: la "pintura" (carrocería, trompa y alerón delantero)
 * toma `bodyColor`, y el resto (gomas, alerones, cockpit, casco y disco) es fijo.
 */
export const CarShape = memo(function CarShape({
  transform,
  bodyColor = COLORS.body,
  number = null,
}: CarShapeProps) {
  const font = useMemo(numberFont, []);
  const label = number === null ? null : String(number);
  const textWidth = label === null ? 0 : font.measureText(label).width;
  // Con dos cifras anchas, el número se achica para entrar en el disco.
  const fit = textWidth > NUMBER_TEXT.maxWidth ? NUMBER_TEXT.maxWidth / textWidth : 1;
  const { cx, cy } = SHAPES.numberDisc;

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
        {label !== null ? (
          // Centrado en el disco: si se achica, se achica hacia el centro.
          <Group transform={[{ translateX: cx }, { translateY: cy }, { scale: fit }]}>
            <Text
              x={-textWidth / 2}
              y={NUMBER_TEXT.baseline - cy}
              text={label}
              font={font}
              color={COLORS.dark}
            />
          </Group>
        ) : null}
      </Group>
    </Group>
  );
});
