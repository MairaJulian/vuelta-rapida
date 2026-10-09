import { render } from '@testing-library/react-native';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { getCurveSections, getFinishLine, getFinishSign, OVAL_TRACK } from '@/core/Track';

import { TrackLayer } from './TrackLayer';
import { COLORS, CURB_RATIO, EDGE_RATIO, FINISH_SIGN } from './TrackLayer.styles';

async function renderTrack(track = OVAL_TRACK) {
  const screen = await render(<TrackLayer track={track} />);
  const findAll = (type: string) => screen.container.queryAll((node) => node.type === type);
  const byColor = (color: string) => findAll('Path').filter((node) => node.props.color === color);
  return { findAll, byColor, tree: JSON.stringify(screen.toJSON()) };
}

describe('TrackLayer', () => {
  it('dibuja borde y asfalto como trazos del trazado central, encima de los pianos', async () => {
    const { findAll } = await renderTrack();
    const strokes = findAll('Path');
    // Dos curvas con dos trazos cada una, y después borde y asfalto.
    expect(strokes.map((node) => node.props.strokeWidth)).toEqual([
      ...Array(4).fill(OVAL_TRACK.width * CURB_RATIO),
      OVAL_TRACK.width * EDGE_RATIO,
      OVAL_TRACK.width,
    ]);
    expect(strokes[5].props).toMatchObject({
      style: 'stroke',
      strokeJoin: 'round',
      color: COLORS.asphalt,
    });
  });

  it('el path del asfalto recorre todos los puntos del trazado y se cierra', async () => {
    const { byColor } = await renderTrack();
    const path: string = byColor(COLORS.asphalt)[0].props.path;
    expect(path.startsWith('M 0 -50 L 100 -50')).toBe(true);
    expect(path.endsWith('L -100 -50 Z')).toBe(true);
    expect(path.match(/[ML] /g)).toHaveLength(OVAL_TRACK.centerline.length);
  });

  it('el ancho de los trazos sigue al ancho de la pista', async () => {
    const { byColor } = await renderTrack({ ...OVAL_TRACK, width: 20 });
    expect(byColor(COLORS.asphalt)[0].props.strokeWidth).toBe(20);
    // El borde es el último trazo blanco (los pianos también tienen fondo blanco).
    expect(byColor(COLORS.edge).at(-1)?.props.strokeWidth).toBe(20 * EDGE_RATIO);
  });

  it('dibuja pianos rayados solo en las dos curvas', async () => {
    const { findAll, byColor } = await renderTrack();
    const stripes = byColor(COLORS.curbStripe);
    expect(stripes).toHaveLength(2);
    expect(findAll('DashPathEffect')).toHaveLength(2);
    // Cada piano va de punta a punta de su semicírculo, sin cerrarse.
    expect(stripes[0].props.path.startsWith('M 100 -50')).toBe(true);
    expect(stripes[0].props.path.endsWith('L 100 50')).toBe(true);
    expect(stripes[1].props.path.startsWith('M -100 50')).toBe(true);
    expect(stripes[1].props.path.endsWith('L -100 -50')).toBe(true);
  });

  it('no pinta el pasto: eso lo hace GrassLayer', async () => {
    const { findAll } = await renderTrack();
    expect(findAll('Fill')).toEqual([]);
  });

  it('dibuja la meta a cuadros en el punto 0, girada según el trazado', async () => {
    const { findAll } = await renderTrack();
    const finish = getFinishLine(OVAL_TRACK);
    const finishGroup = findAll('Group').find((node) => node.props.transform);
    expect(finishGroup?.props.transform).toEqual([
      { translateX: finish.x },
      { translateY: finish.z },
      { rotate: finish.heading },
    ]);
    // 14 m × 1,8 m con cuadros de unos 0,9 m (7 dp del handoff): 16 × 2, la mitad oscuros.
    const darkSquares = findAll('Rect').filter((node) => node.props.color === COLORS.finishDark);
    expect(darkSquares).toHaveLength(16);
    expect(darkSquares[0].props.width).toBeCloseTo(14 / 16, 9);
    expect(darkSquares[0].props.height).toBeCloseTo(0.9, 9);
  });

  it('dibuja el cartel META afuera del circuito, después de la línea', async () => {
    const { findAll } = await renderTrack();
    const sign = getFinishSign(OVAL_TRACK, FINISH_SIGN.length, FINISH_SIGN.depth, FINISH_SIGN.gap);
    const signGroup = findAll('Group').filter((node) => node.props.transform)[1];
    expect(signGroup.props.transform).toEqual([
      { translateX: sign.x },
      { translateY: sign.z },
      { rotate: sign.rotation },
    ]);
    const [plate] = findAll('RoundedRect');
    expect(plate.props).toMatchObject({
      width: FINISH_SIGN.length,
      height: FINISH_SIGN.depth,
      color: COLORS.sign,
    });
    const [text] = findAll('SkiaText');
    expect(text.props).toMatchObject({ text: 'META', color: COLORS.signText });
    // Centrado: la fuente simulada mide 0,6 del tamaño por letra.
    expect(text.props.x).toBeCloseTo(-(4 * FINISH_SIGN.fontSize * 0.6) / 2, 9);
  });

  it('en el Autódromo del Lago dibuja un piano por curva', async () => {
    const { byColor } = await renderTrack(DEFAULT_CIRCUIT);
    expect(byColor(COLORS.curbStripe)).toHaveLength(getCurveSections(DEFAULT_CIRCUIT).length);
    expect(byColor(COLORS.curbStripe)).toHaveLength(6);
  });
});
