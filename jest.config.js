/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: [
    '<rootDir>/test/setup/skia.ts',
    '<rootDir>/test/setup/reanimated.ts',
    '<rootDir>/test/setup/safe-area.ts',
    '<rootDir>/test/setup/kv-store.ts',
    'react-native-gesture-handler/jestSetup',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup/testing-library.ts'],
  // Worklets: usa la implementación JS en vez de la nativa (que requiere el runtime real).
  resolver: require.resolve('react-native-worklets/jest/resolver'),
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/docs/'],
};
