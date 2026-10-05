/**
 * Extiende el mock oficial de Reanimated:
 * - useFrameCallback no existe en el mock; se agrega como jest.fn para que los tests
 *   lean el callback registrado y lo disparen a mano:
 *
 *     const cb = jest.mocked(useFrameCallback).mock.calls.at(-1)![0];
 *     cb({ timestamp: 16, timeSincePreviousFrame: 16, timeSinceFirstFrame: 16 });
 *
 * - useDerivedValue se evalúa de forma perezosa en cada lectura de .value, como en
 *   producción, en vez de congelar el valor del primer render.
 */
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useFrameCallback: jest.fn((_callback: unknown, autostart = true) => ({
      setActive: jest.fn(),
      isActive: autostart,
      callbackId: 1,
    })),
    useDerivedValue: <Value>(processor: () => Value) => ({
      get value() {
        return processor();
      },
      get: () => processor(),
    }),
  };
});
