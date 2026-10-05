const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'android/*', '.expo/*', 'docs/*']),
  expoConfig,
  // core es TypeScript puro: sin React, React Native, Reanimated, Worklets, Skia ni Expo,
  // y sin depender de las capas de UI del proyecto.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                '@shopify/*',
                'expo',
                'expo-*',
                '@expo/*',
                '@/app',
                '@/components',
                '@/hooks',
                '@/input',
                '@/render',
                '@/screens',
              ],
              message: 'core es TypeScript puro: no puede importar librerías de UI ni otras capas.',
            },
          ],
        },
      ],
    },
  },
  // Último: desactiva las reglas de estilo que chocan con Prettier y reporta
  // las diferencias de formato como errores de ESLint.
  eslintPluginPrettierRecommended,
]);
