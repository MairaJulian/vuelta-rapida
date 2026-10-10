import {
  CAR_COLORS,
  colorDistance,
  DEFAULT_CAR_COLOR_ID,
  getCarColor,
  hexToOklab,
  isCarColorId,
} from './CarPalette';

describe('CAR_COLORS', () => {
  it('tiene los 8 colores del handoff, con Rosa en lugar de Tinta', () => {
    expect(CAR_COLORS.map((color) => color.name)).toEqual([
      'Azul',
      'Coral',
      'Lima',
      'Rosa',
      'Turquesa',
      'Violeta',
      'Naranja',
      'Blanco',
    ]);
  });

  it('los ids y los hex no se repiten', () => {
    expect(new Set(CAR_COLORS.map((color) => color.id)).size).toBe(CAR_COLORS.length);
    expect(new Set(CAR_COLORS.map((color) => color.hex)).size).toBe(CAR_COLORS.length);
    CAR_COLORS.forEach((color) => expect(color.hex).toMatch(/^#[0-9A-F]{6}$/));
  });

  it('los oscuros llevan el número en blanco y los claros en tinta (handoff)', () => {
    const whiteNumber = CAR_COLORS.filter((color) => color.numberColor === '#FFFFFF');
    expect(whiteNumber.map((color) => color.id)).toEqual(['blue', 'coral', 'violet']);
  });

  it('el número se lee sobre cada color', () => {
    CAR_COLORS.forEach((color) =>
      expect(colorDistance(color.hex, color.numberColor)).toBeGreaterThan(0.3),
    );
  });

  it('dos colores de la paleta no se confunden entre sí', () => {
    CAR_COLORS.forEach((a, i) =>
      CAR_COLORS.slice(i + 1).forEach((b) =>
        expect(colorDistance(a.hex, b.hex)).toBeGreaterThan(0.1),
      ),
    );
  });

  it('el color por defecto está en la paleta', () => {
    expect(isCarColorId(DEFAULT_CAR_COLOR_ID)).toBe(true);
  });
});

describe('isCarColorId', () => {
  it('acepta solo los ids de la paleta', () => {
    expect(isCarColorId('pink')).toBe(true);
    expect(isCarColorId('ink')).toBe(false);
    expect(isCarColorId('#2F6BDD')).toBe(false);
    expect(isCarColorId(3)).toBe(false);
  });
});

describe('getCarColor', () => {
  it('devuelve el color pedido', () => {
    expect(getCarColor('teal').name).toBe('Turquesa');
  });

  it('con un id desconocido devuelve el azul', () => {
    expect(getCarColor('dorado').id).toBe('blue');
  });
});

describe('colorDistance', () => {
  it('es 0 entre un color y sí mismo, y 1 entre negro y blanco', () => {
    expect(colorDistance('#2F6BDD', '#2F6BDD')).toBe(0);
    expect(colorDistance('#000000', '#FFFFFF')).toBeCloseTo(1, 3);
  });

  it('es simétrica', () => {
    expect(colorDistance('#F164AF', '#535861')).toBeCloseTo(colorDistance('#535861', '#F164AF'));
  });

  it('pasa a OKLab con la luminosidad esperada', () => {
    expect(hexToOklab('#FFFFFF')[0]).toBeCloseTo(1, 3);
    expect(hexToOklab('#000000')[0]).toBeCloseTo(0, 6);
    // Gris neutro: sin a ni b.
    const [, a, b] = hexToOklab('#808080');
    expect(Math.abs(a)).toBeLessThan(1e-3);
    expect(Math.abs(b)).toBeLessThan(1e-3);
  });
});
