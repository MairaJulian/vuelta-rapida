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

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: host('Canvas'),
  Group: host('Group'),
  Fill: host('Fill'),
  Rect: host('Rect'),
  RoundedRect: host('RoundedRect'),
  Circle: host('Circle'),
  Oval: host('Oval'),
  Line: host('Line'),
  Path: host('Path'),
  Text: host('SkiaText'),
  LinearGradient: host('LinearGradient'),
  DashPathEffect: host('DashPathEffect'),
  vec: (x = 0, y = 0) => ({ x, y }),
  // Fuente simulada: mide cada letra como el 60 % del tamaño, para centrar textos.
  matchFont: jest.fn((style?: { fontSize?: number }) => {
    const size = style?.fontSize ?? 14;
    return {
      __mockFont: true,
      measureText: (text: string) => ({ x: 0, y: -size, width: text.length * size * 0.6, height: size }),
    };
  }),
  useFont: jest.fn(() => null),
}));
