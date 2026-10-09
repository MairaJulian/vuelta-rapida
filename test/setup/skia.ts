import { createElement } from 'react';
import type { ReactNode } from 'react';

/**
 * Mock liviano de @shopify/react-native-skia para Jest.
 * Cada componente se renderiza como un elemento host con su mismo nombre, así
 * los tests pueden consultar props sin cargar CanvasKit (wasm).
 */
type HostProps = { children?: ReactNode } & Record<string, unknown>;

const host = (name: string) => {
  const Component = (props: HostProps) => createElement(name, props);
  Component.displayName = name;
  return Component;
};

jest.mock('@shopify/react-native-skia', () => {
  /**
   * Buffers de Skia (`useRSXformBuffer` y compañía): en la app corren el modificador en
   * el hilo de UI cada vez que cambian los valores que usa. Aquí lo corren en cada
   * lectura de `.value`, sobre objetos simples, así los tests ven el resultado.
   */
  const buffer =
    <Item>(make: () => Item) =>
    (size: number, modifier: (item: Item, index: number) => void) => {
      const items = Array.from({ length: size }, make);
      const read = () => {
        items.forEach((item, index) => modifier(item, index));
        return items;
      };
      return {
        get value() {
          return read();
        },
        get: read,
      };
    };
  const rsxform = (scos = 1, ssin = 0, tx = 0, ty = 0) => {
    const xform = {
      scos,
      ssin,
      tx,
      ty,
      set(nextScos: number, nextSsin: number, nextTx: number, nextTy: number) {
        Object.assign(xform, { scos: nextScos, ssin: nextSsin, tx: nextTx, ty: nextTy });
      },
    };
    return xform;
  };
  return {
    Canvas: host('Canvas'),
    Group: host('Group'),
    Fill: host('Fill'),
    Rect: host('Rect'),
    RoundedRect: host('RoundedRect'),
    Circle: host('Circle'),
    Oval: host('Oval'),
    Line: host('Line'),
    Path: host('Path'),
    Points: host('Points'),
    Atlas: host('Atlas'),
    Text: host('SkiaText'),
    LinearGradient: host('LinearGradient'),
    DashPathEffect: host('DashPathEffect'),
    vec: (x = 0, y = 0) => ({ x, y }),
    // Fuente simulada: mide cada letra como el 60 % del tamaño, para centrar textos.
    matchFont: jest.fn((style?: { fontSize?: number }) => {
      const size = style?.fontSize ?? 14;
      return {
        __mockFont: true,
        measureText: (text: string) => ({
          x: 0,
          y: -size,
          width: text.length * size * 0.6,
          height: size,
        }),
      };
    }),
    useFont: jest.fn(() => null),
    // Mezcla de colores simulada: devuelve una descripción legible.
    mixColors: jest.fn((value: number, from: string, to: string) => `mix(${value},${from},${to})`),
    // Dibujar una escena fuera de pantalla: devuelve una imagen falsa con su tamaño.
    drawAsImage: jest.fn(async (_element: unknown, size: { width: number; height: number }) => ({
      __mockImage: true,
      width: () => size.width,
      height: () => size.height,
    })),
    Skia: {
      RSXform: rsxform,
      XYWHRect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
      Color: (color: string) => {
        const value = new Float32Array([0, 0, 0, 1]);
        Object.defineProperty(value, 'source', { value: color });
        return value;
      },
    },
    useRSXformBuffer: buffer(() => rsxform()),
    useColorBuffer: buffer(() => new Float32Array([0, 0, 0, 1])),
  };
});
