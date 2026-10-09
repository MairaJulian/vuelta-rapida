import { Circle, Group } from '@shopify/react-native-skia';

import type { SpriteFrame } from '@/core/SceneryView';

import {
  COLORS,
  PARTICLE_FRAME,
  SPRITE_LAYOUT,
  SPRITE_PADDING,
  TYRE_HOLE_RATIO,
} from './SceneryAtlas.styles';
import type { SceneryAtlasProps } from './SceneryAtlas.types';

/** Centro y radio del círculo que ocupa cada dibujo en su recorte. */
const circleOf = (frame: SpriteFrame) => ({
  cx: frame.x + frame.size / 2,
  cy: frame.y + frame.size / 2,
  r: frame.size / 2 - SPRITE_PADDING,
});

/** Copa vista desde arriba: el círculo, una luz arriba a la izquierda (el sol) y un brillo. */
function Canopy({ frame, base, light }: { frame: SpriteFrame; base: string; light: string }) {
  const { cx, cy, r } = circleOf(frame);
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={base} />
      <Circle cx={cx - 0.2 * r} cy={cy - 0.22 * r} r={0.62 * r} color={light} />
      <Circle cx={cx - 0.36 * r} cy={cy - 0.38 * r} r={0.2 * r} color={COLORS.sparkle} />
    </Group>
  );
}

/** Arbusto: tres matas que se tocan, con un brillo en la de arriba. */
function Bush({ frame, color }: { frame: SpriteFrame; color: string }) {
  const { cx, cy, r } = circleOf(frame);
  return (
    <Group>
      <Circle cx={cx - 0.35 * r} cy={cy + 0.15 * r} r={0.6 * r} color={color} />
      <Circle cx={cx + 0.35 * r} cy={cy + 0.2 * r} r={0.58 * r} color={color} />
      <Circle cx={cx} cy={cy - 0.3 * r} r={0.62 * r} color={color} />
      <Circle cx={cx - 0.1 * r} cy={cy - 0.42 * r} r={0.3 * r} color={COLORS.sparkle} />
    </Group>
  );
}

/** Neumático visto desde arriba: círculo `ink` con el agujero apenas más claro. */
function Tyre({ frame }: { frame: SpriteFrame }) {
  const { cx, cy, r } = circleOf(frame);
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={COLORS.tyre} />
      <Circle cx={cx} cy={cy} r={r * TYRE_HOLE_RATIO} color={COLORS.tyreHole} />
    </Group>
  );
}

/** Círculo lleno de un color: sombras y partícula. */
function Disc({ frame, color }: { frame: SpriteFrame; color: string }) {
  const { cx, cy, r } = circleOf(frame);
  return <Circle cx={cx} cy={cy} r={r} color={color} />;
}

/**
 * Todos los dibujos de la escenografía en su lugar de la textura (`SPRITE_LAYOUT`).
 * No se muestra en pantalla: `useSceneryAtlas` lo rasteriza una vez y la escena lo
 * usa como atlas.
 */
export function SceneryAtlas(_props: SceneryAtlasProps) {
  return (
    <Group>
      {SPRITE_LAYOUT.treeLarge.map((frame, i) => (
        <Canopy key={`large-${i}`} frame={frame} {...COLORS.trees[i]} />
      ))}
      {SPRITE_LAYOUT.treeSmall.map((frame, i) => (
        <Canopy key={`small-${i}`} frame={frame} {...COLORS.trees[i]} />
      ))}
      {SPRITE_LAYOUT.bush.map((frame, i) => (
        <Bush key={`bush-${i}`} frame={frame} color={COLORS.bushes[i]} />
      ))}
      <Disc frame={SPRITE_LAYOUT.shadowLarge} color={COLORS.shadow} />
      <Disc frame={SPRITE_LAYOUT.shadowSmall} color={COLORS.shadow} />
      <Disc frame={SPRITE_LAYOUT.shadowBush} color={COLORS.shadow} />
      <Tyre frame={SPRITE_LAYOUT.tyre} />
      <Disc frame={PARTICLE_FRAME} color={COLORS.particle} />
    </Group>
  );
}
