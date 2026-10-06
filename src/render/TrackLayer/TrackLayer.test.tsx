import { render } from '@testing-library/react-native';

import { DEFAULT_TRACK, getFinishLine } from '@/core/Track';

import { TrackLayer } from './TrackLayer';
import { COLORS, EDGE_RATIO } from './TrackLayer.styles';

async function renderTrack(track = DEFAULT_TRACK) {
  const screen = await render(<TrackLayer track={track} />);
  const findAll = (type: string) => screen.container.queryAll((node) => node.type === type);
  return { findAll, tree: JSON.stringify(screen.toJSON()) };
}

describe('TrackLayer', () => {
  it('dibuja borde y asfalto como trazos del trazado central', async () => {
    const { findAll } = await renderTrack();
    const strokes = findAll('Path');
    expect(strokes.map((node) => node.props.strokeWidth)).toEqual([
      DEFAULT_TRACK.width * EDGE_RATIO,
      DEFAULT_TRACK.width,
    ]);
    expect(strokes[1].props).toMatchObject({
      style: 'stroke',
      strokeJoin: 'round',
      color: COLORS.asphalt,
    });
  });

  it('el path recorre todos los puntos del trazado y se cierra', async () => {
    const { findAll } = await renderTrack();
    const path: string = findAll('Path')[1].props.path;
    expect(path.startsWith('M 0 -50 L 100 -50')).toBe(true);
    expect(path.endsWith('L -100 -50 Z')).toBe(true);
    expect(path.match(/[ML] /g)).toHaveLength(DEFAULT_TRACK.centerline.length);
  });

  it('el ancho de los trazos sigue al ancho de la pista', async () => {
    const { findAll } = await renderTrack({ ...DEFAULT_TRACK, width: 20 });
    expect(findAll('Path')[1].props.strokeWidth).toBe(20);
  });

  it('dibuja césped con franjas', async () => {
    const { findAll, tree } = await renderTrack();
    // Las franjas van en un Fill: cubren todo el lienzo y nunca se acaban.
    const [fill] = findAll('Fill');
    expect(fill.queryAll((node) => node.type === 'LinearGradient')).toHaveLength(1);
    expect(tree).toContain(COLORS.grassStripe);
  });

  it('dibuja la meta a cuadros en el punto 0, girada según el trazado', async () => {
    const { findAll } = await renderTrack();
    const finish = getFinishLine(DEFAULT_TRACK);
    const finishGroup = findAll('Group').find((node) => node.props.transform);
    expect(finishGroup?.props.transform).toEqual([
      { translateX: finish.x },
      { translateY: finish.z },
      { rotate: finish.heading },
    ]);
    // 14 m × 1 m con cuadros de 0,5 m: 56 cuadros, la mitad oscuros.
    const darkSquares = findAll('Rect').filter((node) => node.props.color === COLORS.finishDark);
    expect(darkSquares).toHaveLength(28);
  });
});
