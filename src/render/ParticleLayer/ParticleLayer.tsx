import { Atlas, Skia, useColorBuffer, useRSXformBuffer } from '@shopify/react-native-skia';
import { memo, useMemo } from 'react';

import { DEFAULT_PARTICLE_CONFIG, getParticleLook } from '@/core/Particles';
import { getSpriteTransform } from '@/core/SceneryView';
import { PARTICLE_FRAME, SPRITE_LAYOUT } from '@/render/SceneryAtlas';

import { TINTS } from './ParticleLayer.styles';
import type { ParticleLayerProps } from './ParticleLayer.types';

/** Píxeles que ocupa el círculo de la partícula en la textura, y su centro. */
const DRAWN = PARTICLE_FRAME.size - 2 * SPRITE_LAYOUT.padding;
const CENTER = PARTICLE_FRAME.size / 2;

/**
 * Polvo y humo en coordenadas del mundo, con un solo `Atlas`: cada partícula es el
 * círculo blanco de la textura, escalado a su tamaño y teñido con su color y su
 * opacidad. Los lugares sin partícula quedan con tamaño 0. Va debajo de los autos.
 */
export const ParticleLayer = memo(function ParticleLayer({
  particles,
  image,
  maxParticles = DEFAULT_PARTICLE_CONFIG.maxParticles,
}: ParticleLayerProps) {
  const sprites = useMemo(
    () =>
      Array.from({ length: maxParticles }, () =>
        Skia.XYWHRect(PARTICLE_FRAME.x, PARTICLE_FRAME.y, PARTICLE_FRAME.size, PARTICLE_FRAME.size),
      ),
    [maxParticles],
  );
  const transforms = useRSXformBuffer(maxParticles, (xform, i) => {
    'worklet';
    const particle = particles.get().particles[i];
    if (!particle) {
      xform.set(0, 0, 0, 0);
      return;
    }
    const look = getParticleLook(particle);
    const t = getSpriteTransform(particle.x, particle.z, 0, look.size / DRAWN, CENTER, CENTER);
    xform.set(t.scos, t.ssin, t.tx, t.ty);
  });
  const colors = useColorBuffer(maxParticles, (color, i) => {
    'worklet';
    const particle = particles.get().particles[i];
    const tint = particle && particle.kind === 'dust' ? TINTS.dust : TINTS.smoke;
    color[0] = tint[0];
    color[1] = tint[1];
    color[2] = tint[2];
    color[3] = particle ? getParticleLook(particle).alpha : 0;
  });

  if (!image) {
    return null;
  }
  return (
    <Atlas
      image={image}
      sprites={sprites}
      transforms={transforms}
      colors={colors}
      colorBlendMode="modulate"
    />
  );
});
