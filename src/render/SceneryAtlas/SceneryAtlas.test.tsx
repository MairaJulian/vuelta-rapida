import { render } from '@testing-library/react-native';

import type { SpriteFrame } from '@/core/SceneryView';

import { SceneryAtlas } from './SceneryAtlas';
import {
  ATLAS_SIZE,
  COLORS,
  PARTICLE_FRAME,
  SPRITE_LAYOUT,
  SPRITE_PADDING,
} from './SceneryAtlas.styles';

const FRAMES: SpriteFrame[] = [
  ...SPRITE_LAYOUT.treeLarge,
  ...SPRITE_LAYOUT.treeSmall,
  ...SPRITE_LAYOUT.bush,
  SPRITE_LAYOUT.shadowLarge,
  SPRITE_LAYOUT.shadowSmall,
  SPRITE_LAYOUT.shadowBush,
  SPRITE_LAYOUT.tyre,
  PARTICLE_FRAME,
];

async function renderCircles() {
  const screen = await render(<SceneryAtlas />);
  return screen.container
    .queryAll((node) => node.type === 'Circle')
    .map((node) => node.props as { cx: number; cy: number; r: number; color: string });
}

const contains = (frame: SpriteFrame, x: number, y: number) =>
  x >= frame.x && x <= frame.x + frame.size && y >= frame.y && y <= frame.y + frame.size;

describe('SPRITE_LAYOUT', () => {
  it('los recortes entran en la textura y no se pisan', () => {
    for (const frame of FRAMES) {
      expect(frame.x + frame.size).toBeLessThanOrEqual(ATLAS_SIZE.width);
      expect(frame.y + frame.size).toBeLessThanOrEqual(ATLAS_SIZE.height);
    }
    FRAMES.forEach((a, i) =>
      FRAMES.slice(i + 1).forEach((b) => {
        const apart =
          a.x + a.size <= b.x || b.x + b.size <= a.x || a.y + a.size <= b.y || b.y + b.size <= a.y;
        expect(apart).toBe(true);
      }),
    );
  });

  it('hay un recorte por tono de árbol y de arbusto', () => {
    expect(SPRITE_LAYOUT.treeLarge).toHaveLength(COLORS.trees.length);
    expect(SPRITE_LAYOUT.treeSmall).toHaveLength(COLORS.trees.length);
    expect(SPRITE_LAYOUT.bush).toHaveLength(COLORS.bushes.length);
    expect(SPRITE_LAYOUT.padding).toBe(SPRITE_PADDING);
  });
});

describe('SceneryAtlas', () => {
  it('dibuja copas, arbustos, sombras, el neumático y la partícula', async () => {
    const circles = await renderCircles();
    // Árboles: 3 círculos por copa; arbustos: 4; neumático: 2; sombras y partícula: 1.
    expect(circles).toHaveLength(3 * 3 + 3 * 3 + 3 * 4 + 2 + 4);
    expect(circles.filter((circle) => circle.color === COLORS.shadow)).toHaveLength(3);
    expect(circles.filter((circle) => circle.color === COLORS.particle)).toHaveLength(1);
    expect(circles.filter((circle) => circle.color === COLORS.tyre)).toHaveLength(1);
  });

  it('cada dibujo queda dentro de su recorte, con el margen libre', async () => {
    const circles = await renderCircles();
    for (const circle of circles) {
      const frame = FRAMES.find((item) => contains(item, circle.cx, circle.cy))!;
      expect(frame).toBeDefined();
      expect(circle.cx - circle.r).toBeGreaterThanOrEqual(frame.x + SPRITE_PADDING - 1e-9);
      expect(circle.cx + circle.r).toBeLessThanOrEqual(
        frame.x + frame.size - SPRITE_PADDING + 1e-9,
      );
      expect(circle.cy - circle.r).toBeGreaterThanOrEqual(frame.y + SPRITE_PADDING - 1e-9);
      expect(circle.cy + circle.r).toBeLessThanOrEqual(
        frame.y + frame.size - SPRITE_PADDING + 1e-9,
      );
    }
  });

  it('la copa ocupa todo el círculo del recorte: el diámetro del árbol', async () => {
    const circles = await renderCircles();
    const [frame] = SPRITE_LAYOUT.treeLarge;
    const base = circles.find(
      (circle) => circle.cx === frame.x + frame.size / 2 && circle.color === COLORS.trees[0].base,
    )!;
    expect(base.r).toBe(frame.size / 2 - SPRITE_PADDING);
  });
});
