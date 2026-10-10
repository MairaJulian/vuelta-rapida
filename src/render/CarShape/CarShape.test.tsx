import { render } from '@testing-library/react-native';

import { CAR_COLORS, colorDistance } from '@/core/CarPalette';
import { COLORS as TRACK_COLORS } from '@/render/TrackLayer/TrackLayer.styles';

import { CarShape } from './CarShape';
import { CAR_SCALE, COLORS, NUMBER_TEXT, SHAPES, VIEWBOX } from './CarShape.styles';

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

  it('solo la pintura (carrocería, trompa y alerón delantero) toma el color', async () => {
    const screen = await render(<CarShape transform={shared([])} bodyColor="#F164AF" />);
    const painted = screen.container.queryAll((node) => node.props.color === '#F164AF');
    expect(painted.map((node) => node.type)).toEqual(['Path', 'Path', 'RoundedRect']);
  });

  it('sin número, el disco queda vacío', async () => {
    const screen = await render(<CarShape transform={shared([])} />);
    expect(screen.container.queryAll((node) => node.type === 'SkiaText')).toHaveLength(0);
  });

  it('dibuja el número centrado en el disco, en el color de las gomas', async () => {
    const screen = await render(<CarShape transform={shared([])} number={27} />);
    const [text] = screen.container.queryAll((node) => node.type === 'SkiaText');
    expect(text.props.text).toBe('27');
    expect(text.props.color).toBe(COLORS.dark);
    // La fuente simulada mide 0,6 del tamaño por letra: 2 × 8,5 × 0,6 = 10,2.
    expect(text.props.x).toBeCloseTo(-5.1);
    const group = screen.container.queryAll((node) => node.type === 'Group').at(-1)!;
    expect(group.props.transform).toEqual([
      { translateX: SHAPES.numberDisc.cx },
      { translateY: SHAPES.numberDisc.cy },
      { scale: 1 },
    ]);
  });

  it('si el número no entra en el disco, lo achica', async () => {
    const screen = await render(<CarShape transform={shared([])} number={888} />);
    const group = screen.container.queryAll((node) => node.type === 'Group').at(-1)!;
    expect(group.props.transform[2].scale).toBeCloseTo(NUMBER_TEXT.maxWidth / (3 * 8.5 * 0.6));
  });
});

describe('paleta de autos sobre la pista', () => {
  // Umbrales: el azul de siempre (0,19 del asfalto) se ve bien en la pista; la tinta del
  // handoff (0,04 de las gomas) pierde la silueta.
  it('cada color se distingue del asfalto y de las gomas y alerones', () => {
    CAR_COLORS.forEach((color) => {
      expect(colorDistance(color.hex, TRACK_COLORS.asphalt)).toBeGreaterThan(0.18);
      expect(colorDistance(color.hex, COLORS.dark)).toBeGreaterThan(0.3);
    });
  });
});
