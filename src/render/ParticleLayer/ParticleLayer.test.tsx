import { render } from '@testing-library/react-native';

import { createParticleState, getParticleLook } from '@/core/Particles';
import type { Particle, ParticleState } from '@/core/Particles';
import { PARTICLE_FRAME, SPRITE_LAYOUT } from '@/render/SceneryAtlas';

import { ParticleLayer } from './ParticleLayer';
import { TINTS } from './ParticleLayer.styles';

const image = { __mockImage: true } as never;

const particle = (overrides: Partial<Particle>): Particle => ({
  kind: 'dust',
  x: 10,
  z: 5,
  vx: 0,
  vz: 0,
  age: 0.2,
  life: 1,
  size: 1,
  growth: 2,
  ...overrides,
});

function stateWith(list: Particle[]) {
  const state: ParticleState = { ...createParticleState(1), particles: list };
  return { get: () => state, value: state } as never;
}

async function renderLayer(list: Particle[], withImage = true) {
  const screen = await render(
    <ParticleLayer particles={stateWith(list)} image={withImage ? image : null} maxParticles={4} />,
  );
  const [atlas] = screen.container.queryAll((node) => node.type === 'Atlas');
  return atlas;
}

describe('ParticleLayer', () => {
  it('un solo Atlas con un lugar por partícula, todos con el círculo de la textura', async () => {
    const atlas = await renderLayer([]);
    expect(atlas.props.image).toBe(image);
    expect(atlas.props.sprites).toHaveLength(4);
    expect(atlas.props.sprites[0]).toEqual({
      x: PARTICLE_FRAME.x,
      y: PARTICLE_FRAME.y,
      width: PARTICLE_FRAME.size,
      height: PARTICLE_FRAME.size,
    });
    expect(atlas.props.colorBlendMode).toBe('modulate');
  });

  it('cada partícula va en su lugar, centrada y del tamaño que le toca', async () => {
    const dust = particle({});
    const atlas = await renderLayer([dust]);
    const [xform, empty] = atlas.props.transforms.value;
    const look = getParticleLook(dust);
    const scale = look.size / (PARTICLE_FRAME.size - 2 * SPRITE_LAYOUT.padding);
    expect(xform.scos).toBeCloseTo(scale, 9);
    // El centro del recorte cae sobre la partícula.
    expect(xform.scos * (PARTICLE_FRAME.size / 2) + xform.tx).toBeCloseTo(dust.x, 9);
    expect(xform.scos * (PARTICLE_FRAME.size / 2) + xform.ty).toBeCloseTo(dust.z, 9);
    // Los lugares sin partícula no se ven.
    expect(empty).toMatchObject({ scos: 0, ssin: 0 });
  });

  it('el polvo y el humo tienen su color y se desvanecen', async () => {
    const dust = particle({ kind: 'dust' });
    const smoke = particle({ kind: 'smoke', age: 0.8 });
    const atlas = await renderLayer([dust, smoke]);
    const [dustColor, smokeColor, empty] = atlas.props.colors.value as Float32Array[];
    expect(Array.from(dustColor.slice(0, 3))).toEqual(TINTS.dust.map(Math.fround));
    expect(Array.from(smokeColor.slice(0, 3))).toEqual(TINTS.smoke.map(Math.fround));
    expect(dustColor[3]).toBeCloseTo(getParticleLook(dust).alpha, 6);
    expect(smokeColor[3]).toBeLessThan(dustColor[3]);
    expect(empty[3]).toBe(0);
  });

  it('sin textura no dibuja nada', async () => {
    expect(await renderLayer([particle({})], false)).toBeUndefined();
  });
});
