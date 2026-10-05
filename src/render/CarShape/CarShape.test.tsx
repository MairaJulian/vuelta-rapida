import { render } from '@testing-library/react-native';

import { CarShape } from './CarShape';
import { CAR_SCALE, COLORS, VIEWBOX } from './CarShape.styles';

const shared = <Value,>(value: Value) => ({ value }) as never;

describe('CarShape', () => {
  it('mide 2 × 4,5 m', () => {
    expect(VIEWBOX.width * CAR_SCALE).toBeCloseTo(2, 12);
    expect(VIEWBOX.height * CAR_SCALE).toBeCloseTo(4.5, 12);
  });

  it('aplica la transformación recibida sin leerla', async () => {
    const transform = shared([{ translateX: 3 }]);
    const screen = await render(<CarShape transform={transform} />);
    const outer = screen.container.queryAll((node) => node.type === 'Group')[0];
    expect(outer.props.transform).toBe(transform);
  });

  it('centra el dibujo en el auto', async () => {
    const screen = await render(<CarShape transform={shared([])} />);
    const inner = screen.container.queryAll((node) => node.type === 'Group')[1];
    expect(inner.props.transform).toEqual([
      { scale: CAR_SCALE },
      { translateX: -20 },
      { translateY: -45 },
    ]);
  });

  it('usa el azul del jugador por defecto y acepta otro color', async () => {
    const first = await render(<CarShape transform={shared([])} />);
    expect(JSON.stringify(first.toJSON())).toContain(COLORS.body);

    const second = await render(<CarShape transform={shared([])} bodyColor="#E04A3A" />);
    const tree = JSON.stringify(second.toJSON());
    expect(tree).toContain('#E04A3A');
    expect(tree).not.toContain(COLORS.body);
  });

  it('incluye ruedas, casco y halo', async () => {
    const screen = await render(<CarShape transform={shared([])} />);
    const tree = JSON.stringify(screen.toJSON());
    expect(tree).toContain(COLORS.dark);
    expect(tree).toContain(COLORS.helmet);
    expect(tree).toContain('M15 37 Q20 31 25 37');
  });
});
