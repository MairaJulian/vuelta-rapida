import { render } from '@testing-library/react-native';

import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { createParticleState } from '@/core/Particles';
import { generateScenery } from '@/core/Scenery';
import { DEFAULT_SCENERY_DISPLAY } from '@/core/SceneryView';
import { OVAL_TRACK } from '@/core/Track';
import type { UseSceneryViewResult } from '@/hooks/useSceneryView';

import { DriveCanvas } from './DriveCanvas';
import { DEFAULT_STRIPE_ANGLE } from './DriveCanvas.styles';
import type { DriveCanvasProps } from './DriveCanvas.types';

// Las capas de la escena se prueban solas; aquí se reemplazan por elementos con su
// nombre, para ver el orden de dibujo y las props que reciben.
jest.mock('@/render/GrassLayer', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GrassLayer: (props: object) => require('react').createElement('GrassLayer', props),
}));
jest.mock('@/render/AsphaltDetails', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  AsphaltDetails: (props: object) => require('react').createElement('AsphaltDetails', props),
}));
jest.mock('@/render/SceneryLayer', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SceneryLayer: (props: object) => require('react').createElement('SceneryLayer', props),
}));
jest.mock('@/render/ParticleLayer', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ParticleLayer: (props: object) => require('react').createElement('ParticleLayer', props),
}));

const shared = <Value,>(value: Value) => ({ value, get: () => value }) as never;
const sprites = () => ({ sprites: shared([]), transforms: shared([]) });
const sceneryView: UseSceneryViewResult = {
  atlas: {
    shadows: sprites(),
    tyres: sprites(),
    bushes: sprites(),
    treesSmall: sprites(),
    treesLarge: sprites(),
  },
  levels: {
    bushes: shared([]),
    signs: shared([]),
    treesSmall: shared([]),
    treesLarge: shared([]),
  },
};
const track = {
  ...DEFAULT_CIRCUIT,
  scenery: generateScenery(DEFAULT_CIRCUIT, { seed: 7, treeDensity: 0.3 }),
};

async function renderCanvas(props: Partial<DriveCanvasProps> = {}) {
  const cameraTransform = shared([{ scale: 14 }]);
  const carTransform = shared([{ translateX: 1 }]);
  const screen = await render(
    <DriveCanvas
      track={OVAL_TRACK}
      cameraTransform={cameraTransform}
      carTransform={carTransform}
      {...props}
    />,
  );
  const findAll = (type: string) => screen.container.queryAll((node) => node.type === type);
  const camera = findAll('Group').find((node) => node.props.transform === cameraTransform)!;
  // Las piezas del mundo, en orden de dibujo (hijos directos del grupo de la cámara).
  const layers = () =>
    camera.children.map((child) => (typeof child === 'string' ? child : child.type));
  return { findAll, camera, layers, carTransform };
}

describe('DriveCanvas', () => {
  it('el grupo de la cámara envuelve el pasto, la pista y el auto', async () => {
    const { camera, carTransform } = await renderCanvas();
    expect(camera).toBeDefined();
    const car = camera.queryAll(
      (node) => node.type === 'Group' && node.props.transform === carTransform,
    );
    expect(car).toHaveLength(1);
    expect(camera.queryAll((node) => node.type === 'RoundedRect').length).toBeGreaterThan(0);
  });

  it('dibuja el auto con el color y el número que recibe', async () => {
    const { findAll } = await renderCanvas({ carColor: '#F164AF', carNumber: 27 });
    const pink = findAll('Path').filter((node) => node.props.color === '#F164AF');
    expect(pink).toHaveLength(2); // carrocería y trompa
    expect(findAll('SkiaText').map((node) => node.props.text)).toContain('27');
  });

  it('sin color ni número, el auto azul con el disco vacío', async () => {
    const { findAll } = await renderCanvas();
    expect(findAll('Path').filter((node) => node.props.color === '#2F6BDD')).toHaveLength(2);
    expect(findAll('SkiaText').map((node) => node.props.text)).not.toContain('27');
  });

  it('sin escenografía: pasto con el rumbo por defecto, pista y auto', async () => {
    const { findAll, layers } = await renderCanvas();
    expect(findAll('GrassLayer')[0].props).toEqual({
      angle: DEFAULT_STRIPE_ANGLE,
      contrast: DEFAULT_SCENERY_DISPLAY.grassContrast,
    });
    // Pasto, pista (un grupo) y auto (otro grupo).
    expect(layers()).toEqual(['GrassLayer', 'Group', 'Group']);
  });

  it('con escenografía: suelo debajo del auto y lo elevado encima', async () => {
    const atlas = { __mockImage: true } as never;
    const particles = shared(createParticleState(1));
    const { findAll, layers } = await renderCanvas({ track, sceneryView, particles, atlas });
    expect(layers()).toEqual([
      'GrassLayer',
      'Group',
      'AsphaltDetails',
      'SceneryLayer',
      'ParticleLayer',
      'Group',
      'SceneryLayer',
    ]);
    const [ground, raised] = findAll('SceneryLayer');
    expect(ground.props).toMatchObject({ level: 'ground', atlas, view: sceneryView });
    expect(raised.props).toMatchObject({ level: 'raised', scenery: track.scenery });
    expect(findAll('ParticleLayer')[0].props).toMatchObject({ particles, image: atlas });
    expect(findAll('GrassLayer')[0].props.angle).toBe(track.scenery.grassStripeAngle);
  });

  it('el panel apaga la escenografía, las partículas y cambia el contraste', async () => {
    const particles = shared(createParticleState(1));
    const { findAll } = await renderCanvas({
      track,
      sceneryView,
      particles,
      display: { visible: false, particles: false, parallax: 1, grassContrast: 0.2 },
    });
    expect(findAll('SceneryLayer')).toEqual([]);
    expect(findAll('AsphaltDetails')).toEqual([]);
    expect(findAll('ParticleLayer')).toEqual([]);
    expect(findAll('GrassLayer')[0].props.contrast).toBe(0.2);
  });
});
