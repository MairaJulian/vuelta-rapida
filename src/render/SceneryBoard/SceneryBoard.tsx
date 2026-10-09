import { Group, Rect, RoundedRect, Text } from '@shopify/react-native-skia';
import { memo } from 'react';

import { BILLBOARD_BRANDS } from '@/core/Scenery';

import {
  BRAND_STYLES,
  COLORS,
  FONT_SIZE,
  PLATE_RADIUS,
  STRIPE_HEIGHT,
  TEXT_FILL,
  TEXT_SIZE,
} from './SceneryBoard.styles';
import type { SceneryBoardProps } from './SceneryBoard.types';

/**
 * Cartel de la escenografía visto desde arriba, como el cartel META del handoff: una
 * placa con el texto derecho. Los de distancia muestran los metros que faltan para la
 * curva; los publicitarios, una marca inventada con sus colores.
 */
export const SceneryBoard = memo(function SceneryBoard({ board, font }: SceneryBoardProps) {
  const isDistance = board.kind === 'distanceBoard';
  const style = isDistance
    ? { plate: COLORS.distancePlate, text: COLORS.distanceText }
    : BRAND_STYLES[board.variant % BRAND_STYLES.length];
  const text = isDistance
    ? String(board.variant)
    : BILLBOARD_BRANDS[board.variant % BILLBOARD_BRANDS.length];
  // El texto se achica si no entra en el cartel.
  const width = font.measureText(text).width;
  const wanted = (isDistance ? TEXT_SIZE.distance : TEXT_SIZE.billboard) / FONT_SIZE;
  const fit = width > 0 ? (board.length * TEXT_FILL) / width : wanted;
  const scale = Math.min(wanted, fit);
  // Con la franja coral, el número sube para quedar centrado en lo blanco.
  const lift = isDistance ? STRIPE_HEIGHT / 2 : 0;

  return (
    <Group
      transform={[{ translateX: board.x }, { translateY: board.z }, { rotate: board.rotation }]}
    >
      <RoundedRect
        x={-board.length / 2}
        y={-board.depth / 2}
        width={board.length}
        height={board.depth}
        r={PLATE_RADIUS}
        color={style.plate}
      />
      {isDistance ? (
        <Rect
          x={-board.length / 2 + PLATE_RADIUS}
          y={board.depth / 2 - STRIPE_HEIGHT - PLATE_RADIUS / 2}
          width={board.length - 2 * PLATE_RADIUS}
          height={STRIPE_HEIGHT}
          color={COLORS.distanceStripe}
        />
      ) : null}
      <Group transform={[{ translateY: -lift }, { scale }]}>
        <Text x={-width / 2} y={FONT_SIZE * 0.36} text={text} font={font} color={style.text} />
      </Group>
    </Group>
  );
});
