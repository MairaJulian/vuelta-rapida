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
 * - useAnimatedSensor es un jest.fn que devuelve un sensor con .get()/.set(), para
 *   que los tests revisen con qué configuración se registró y escriban lecturas:
 *
 *     const { sensor } = jest.mocked(useAnimatedSensor).mock.results.at(-1)!.value;
 *     sensor.set({ x: 0, y: -9.81, z: 0, interfaceOrientation: 90 });
 */
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    useAnimatedSensor: jest.fn((_type: unknown, config?: Record<string, unknown>) => {
      const sensor = {
        value: { x: 0, y: 0, z: 0, interfaceOrientation: 0 } as Record<string, number>,
        get() {
          return sensor.value;
        },
        set(next: Record<string, number>) {
          sensor.value = next;
        },
      };
      return {
        sensor,
        unregister: jest.fn(),
        isAvailable: false,
        config: { interval: 'auto', adjustToInterfaceOrientation: true, ...config },
      };
    }),
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
