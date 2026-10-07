import { FEATURE_FLAGS } from './FeatureFlags';

describe('FEATURE_FLAGS', () => {
  it('la inclinación está desactivada por defecto', () => {
    expect(FEATURE_FLAGS.tiltControl).toBe(false);
  });

  it('no se puede cambiar en tiempo de ejecución', () => {
    expect(Object.isFrozen(FEATURE_FLAGS)).toBe(true);
  });
});
