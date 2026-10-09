import { Group, Points, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import type { SkPoint } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { COLORS, LAYOUT, SPECTATOR_COLORS } from './Grandstand.styles';
import type { GrandstandProps } from './Grandstand.types';

/**
 * Público de la tribuna, agrupado por color: un `Points` por color. Lleno, con algunos
 * lugares vacíos siguiendo un patrón fijo (siempre el mismo, sin azar).
 */
function spectatorsByColor(length: number, depth: number): SkPoint[][] {
  const groups: SkPoint[][] = SPECTATOR_COLORS.map(() => []);
  const seats = Math.floor((length - 2 * LAYOUT.seat) / LAYOUT.seat) + 1;
  for (let row = 0; row < LAYOUT.rows; row += 1) {
    const y = -depth / 2 + LAYOUT.frontGap + LAYOUT.rowDepth * (row + 0.5);
    for (let seat = 0; seat < seats; seat += 1) {
      if ((row * 13 + seat * 7) % 9 === 0) {
        continue;
      }
      const x = -length / 2 + LAYOUT.seat + seat * LAYOUT.seat;
      groups[(row * 3 + seat * 5) % SPECTATOR_COLORS.length].push(vec(x, y));
    }
  }
  return groups;
}

/**
 * Tribuna vista desde arriba: gradas con escalones y público, y un techo azul sobre
 * las últimas filas. Se dibuja en dos partes para que el techo, más alto, se corra más
 * con el paralaje.
 */
export const Grandstand = memo(function Grandstand({ stand, part }: GrandstandProps) {
  const { length, depth } = stand;
  const spectators = useMemo(() => spectatorsByColor(length, depth), [length, depth]);
  const front = -depth / 2;
  const transform = [{ translateX: stand.x }, { translateY: stand.z }, { rotate: stand.rotation }];

  if (part === 'roof') {
    const roofDepth = depth / 2 - LAYOUT.roofFrom;
    const spacing = length / (LAYOUT.beams + 1);
    return (
      <Group transform={transform}>
        <RoundedRect
          x={-length / 2}
          y={LAYOUT.roofFrom}
          width={length}
          height={roofDepth}
          r={LAYOUT.radius}
          color={COLORS.roof}
        />
        <Rect
          x={-length / 2 + LAYOUT.radius}
          y={LAYOUT.roofFrom}
          width={length - 2 * LAYOUT.radius}
          height={LAYOUT.roofEdge}
          color={COLORS.roofEdge}
        />
        {Array.from({ length: LAYOUT.beams }, (_, i) => (
          <Rect
            key={i}
            x={-length / 2 + spacing * (i + 1) - LAYOUT.beam / 2}
            y={LAYOUT.roofFrom + LAYOUT.roofEdge}
            width={LAYOUT.beam}
            height={roofDepth - LAYOUT.roofEdge}
            color={COLORS.beams}
          />
        ))}
      </Group>
    );
  }

  return (
    <Group transform={transform}>
      <RoundedRect
        x={-length / 2}
        y={front}
        width={length}
        height={depth}
        r={LAYOUT.radius}
        color={COLORS.stands}
      />
      <Rect x={-length / 2} y={front} width={length} height={LAYOUT.rail} color={COLORS.steps} />
      {Array.from({ length: LAYOUT.rows - 1 }, (_, i) => (
        <Rect
          key={i}
          x={-length / 2}
          y={front + LAYOUT.frontGap + LAYOUT.rowDepth * (i + 1) - LAYOUT.step / 2}
          width={length}
          height={LAYOUT.step}
          color={COLORS.steps}
        />
      ))}
      {spectators.map((points, i) => (
        <Points
          key={SPECTATOR_COLORS[i]}
          points={points}
          mode="points"
          strokeWidth={LAYOUT.spectator}
          strokeCap="round"
          color={SPECTATOR_COLORS[i]}
        />
      ))}
    </Group>
  );
});
