import { render } from '@testing-library/react-native';

import { GRANDSTAND_SIZE } from '@/core/Scenery';
import type { SceneryObject } from '@/core/Scenery';

import { Grandstand } from './Grandstand';
import { COLORS, LAYOUT, SPECTATOR_COLORS } from './Grandstand.styles';

const stand: SceneryObject = {
  kind: 'grandstand',
  x: -125,
  z: 182,
  rotation: 0,
  ...GRANDSTAND_SIZE,
  variant: 0,
};

async function renderPart(part: 'stands' | 'roof') {
  const screen = await render(<Grandstand stand={stand} part={part} />);
  const find = (type: string) => screen.container.queryAll((node) => node.type === type);
  return { find };
}

describe('Grandstand', () => {
  it('se ubica y gira según sus datos', async () => {
    const { find } = await renderPart('stands');
    expect(find('Group')[0].props.transform).toEqual([
      { translateX: -125 },
      { translateY: 182 },
      { rotate: 0 },
    ]);
  });

  it('las gradas ocupan toda la tribuna, con el público en filas mirando a la pista', async () => {
    const { find } = await renderPart('stands');
    expect(find('RoundedRect')[0].props).toMatchObject({
      width: GRANDSTAND_SIZE.length,
      height: GRANDSTAND_SIZE.depth,
      color: COLORS.stands,
    });
    const groups = find('Points');
    expect(groups).toHaveLength(SPECTATOR_COLORS.length);
    const all = groups.flatMap((node) => node.props.points as { x: number; y: number }[]);
    // Unas 50 butacas por fila, con algunas vacías.
    expect(all.length).toBeGreaterThan(LAYOUT.rows * 40);
    // El público queda en la mitad de adelante (y negativa mira a la pista) y adentro.
    for (const point of all) {
      expect(Math.abs(point.x)).toBeLessThan(GRANDSTAND_SIZE.length / 2);
      expect(point.y).toBeLessThan(GRANDSTAND_SIZE.depth / 2);
      expect(point.y).toBeGreaterThan(-GRANDSTAND_SIZE.depth / 2);
    }
  });

  it('el público siempre es el mismo', async () => {
    const first = (await renderPart('stands')).find('Points').map((node) => node.props.points);
    const second = (await renderPart('stands')).find('Points').map((node) => node.props.points);
    expect(second).toEqual(first);
  });

  it('el techo cubre la parte de atrás, con su borde y sus vigas', async () => {
    const { find } = await renderPart('roof');
    const [roof] = find('RoundedRect');
    expect(roof.props).toMatchObject({ color: COLORS.roof, width: GRANDSTAND_SIZE.length });
    expect(roof.props.y).toBe(LAYOUT.roofFrom);
    expect(roof.props.y + roof.props.height).toBeCloseTo(GRANDSTAND_SIZE.depth / 2, 9);
    expect(find('Rect').filter((node) => node.props.color === COLORS.beams)).toHaveLength(
      LAYOUT.beams,
    );
    expect(find('Points')).toEqual([]);
  });
});
