/**
 * Mock oficial de react-native-safe-area-context: insets en 0 por defecto.
 * Los tests que necesiten otros valores usan jest.mocked(useSafeAreaInsets).mockReturnValue(...).
 */
jest.mock(
  'react-native-safe-area-context',
  () =>
    jest.requireActual<{ default: unknown }>('react-native-safe-area-context/jest/mock').default,
);
