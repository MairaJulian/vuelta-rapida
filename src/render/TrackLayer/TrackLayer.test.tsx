import { render } from '@testing-library/react-native';

import { DEFAULT_TRACK, getCenterlineRect } from '@/core/Track';

import { TrackLayer } from './TrackLayer';
import { COLORS, EDGE_RATIO } from './TrackLayer.styles';

async function renderTrack() {
  const screen = await render(<TrackLayer track={DEFAULT_TRACK} />);
  const findAll = (type: string) => screen.container.queryAll((node) => node.type === type);
  return { findAll, tree: JSON.stringify(screen.toJSON()) };
}

describe('TrackLayer', () => {
  it('dibuja borde y asfalto sobre la línea central con forma de estadio', async () => {
    const { findAll } = await renderTrack();
    const rect = getCenterlineRect(DEFAULT_TRACK);
    const strokes = findAll('RoundedRect');
    expect(strokes.map((node) => node.props.strokeWidth)).toEqual([
      DEFAULT_TRACK.width * EDGE_RATIO,
      DEFAULT_TRACK.width,
    ]);
    expect(strokes[1].props).toMatchObject({
      x: rect.x,
      y: rect.z,
      width: rect.width,
      height: rect.height,
      r: rect.radius,
      style: 'stroke',
      color: COLORS.asphalt,
    });
  });

  it('dibuja pianos rayados solo en las dos curvas', async () => {
    const { findAll } = await renderTrack();
    expect(findAll('Path')).toHaveLength(4);
    expect(findAll('DashPathEffect')).toHaveLength(2);
  });

  it('las curvas son semicírculos hacia afuera de cada extremo', async () => {
    const { tree } = await renderTrack();
    expect(tree).toContain('M -100 -50 A 50 50 0 0 0 -100 50');
    expect(tree).toContain('M 100 -50 A 50 50 0 0 1 100 50');
  });

  it('dibuja césped con franjas y la meta a cuadros', async () => {
    const { findAll, tree } = await renderTrack();
    // Las franjas van en un Fill: cubren todo el lienzo y nunca se acaban.
    const [fill] = findAll('Fill');
    expect(fill.queryAll((node) => node.type === 'LinearGradient')).toHaveLength(1);
    expect(tree).toContain(COLORS.grassStripe);
    // 1 m × 8 m con cuadros de 0,5 m: 32 cuadros, la mitad oscuros.
    const darkSquares = findAll('Rect').filter((node) => node.props.color === COLORS.finishDark);
    expect(darkSquares).toHaveLength(16);
  });
});
