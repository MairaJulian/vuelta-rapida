import { matchFont } from '@shopify/react-native-skia';
import { render } from '@testing-library/react-native';

import { BILLBOARD_BRANDS, BILLBOARD_SIZE, DISTANCE_BOARD_SIZE } from '@/core/Scenery';
import type { SceneryObject } from '@/core/Scenery';

import { SceneryBoard } from './SceneryBoard';
import { BRAND_STYLES, COLORS, FONT_SIZE, TEXT_FILL, TEXT_SIZE } from './SceneryBoard.styles';

const font = matchFont({ fontSize: FONT_SIZE });

const board = (overrides: Partial<SceneryObject>): SceneryObject => ({
  kind: 'billboard',
  x: 10,
  z: 20,
  rotation: 0.3,
  ...BILLBOARD_SIZE,
  variant: 0,
  ...overrides,
});

async function renderBoard(object: SceneryObject) {
  const screen = await render(<SceneryBoard board={object} font={font} />);
  const find = (type: string) => screen.container.queryAll((node) => node.type === type);
  return { find };
}

describe('SceneryBoard', () => {
  it('ubica y gira el cartel según sus datos', async () => {
    const { find } = await renderBoard(board({}));
    expect(find('Group')[0].props.transform).toEqual([
      { translateX: 10 },
      { translateY: 20 },
      { rotate: 0.3 },
    ]);
    expect(find('RoundedRect')[0].props).toMatchObject({
      width: BILLBOARD_SIZE.length,
      height: BILLBOARD_SIZE.depth,
    });
  });

  it('el cartel publicitario muestra la marca con sus colores', async () => {
    const { find } = await renderBoard(board({ variant: 2 }));
    expect(find('RoundedRect')[0].props.color).toBe(BRAND_STYLES[2].plate);
    expect(find('SkiaText')[0].props).toMatchObject({
      text: BILLBOARD_BRANDS[2],
      color: BRAND_STYLES[2].text,
    });
  });

  it('achica una marca larga para que entre en el cartel', async () => {
    const { find } = await renderBoard(board({ variant: 2 }));
    // ALFAJORES COMETA: 16 letras de 0,6 m con la fuente simulada = 9,6 m sin escalar.
    const [, textGroup] = find('Group');
    const scale = (textGroup.props.transform[1] as { scale: number }).scale;
    expect(scale).toBeCloseTo((BILLBOARD_SIZE.length * TEXT_FILL) / 9.6, 9);
    expect(scale).toBeLessThan(TEXT_SIZE.billboard);
  });

  it('el cartel de distancia muestra los metros, en blanco con franja coral', async () => {
    const { find } = await renderBoard(
      board({ kind: 'distanceBoard', ...DISTANCE_BOARD_SIZE, variant: 200 }),
    );
    expect(find('RoundedRect')[0].props.color).toBe(COLORS.distancePlate);
    expect(find('Rect')[0].props.color).toBe(COLORS.distanceStripe);
    expect(find('SkiaText')[0].props).toMatchObject({ text: '200', color: COLORS.distanceText });
    // Tres cifras entran a tamaño completo.
    const [, textGroup] = find('Group');
    expect((textGroup.props.transform[1] as { scale: number }).scale).toBe(TEXT_SIZE.distance);
  });
});
