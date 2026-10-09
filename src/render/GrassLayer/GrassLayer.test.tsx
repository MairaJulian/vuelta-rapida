import { render } from '@testing-library/react-native';

import { GrassLayer } from './GrassLayer';
import { COLORS, STRIPE_WIDTH } from './GrassLayer.styles';

async function renderGrass(angle: number, contrast: number) {
  const screen = await render(<GrassLayer angle={angle} contrast={contrast} />);
  const [gradient] = screen.container.queryAll((node) => node.type === 'LinearGradient');
  return { screen, gradient };
}

describe('GrassLayer', () => {
  it('pinta todo el lienzo con un gradiente que se repite', async () => {
    const { screen, gradient } = await renderGrass(0, 0.6);
    const [fill] = screen.container.queryAll((node) => node.type === 'Fill');
    expect(fill.queryAll((node) => node.type === 'LinearGradient')).toHaveLength(1);
    expect(gradient.props).toMatchObject({ mode: 'repeat', positions: [0, 0.5, 0.5, 1] });
  });

  it('alterna el verde del pasto con la franja mezclada según el contraste', async () => {
    const { gradient } = await renderGrass(0, 0.6);
    // El mock de mixColors describe la mezcla.
    const stripe = `mix(0.6,${COLORS.grass},${COLORS.stripe})`;
    expect(gradient.props.colors).toEqual([COLORS.grass, COLORS.grass, stripe, stripe]);
  });

  it('las franjas corren en el rumbo pedido: el gradiente avanza perpendicular a ellas', async () => {
    // Rumbo 0: franjas verticales (hacia -z); el gradiente avanza hacia +x.
    const vertical = await renderGrass(0, 1);
    expect(vertical.gradient.props.end.x).toBeCloseTo(STRIPE_WIDTH * 2, 9);
    expect(vertical.gradient.props.end.y).toBeCloseTo(0, 9);
    // Rumbo π/2: franjas horizontales; el gradiente avanza hacia +z.
    const horizontal = await renderGrass(Math.PI / 2, 1);
    expect(horizontal.gradient.props.end.x).toBeCloseTo(0, 9);
    expect(horizontal.gradient.props.end.y).toBeCloseTo(STRIPE_WIDTH * 2, 9);
  });
});
