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
                '@/audio',
                '@/components',
                '@/haptics',
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
  // En un worklet, un valor por defecto que es una variable (una constante del módulo)
  // no viaja al hilo de UI: allá no existe y la app se cae. Jest no lo detecta. El valor
  // por defecto va en el cuerpo: `const config = settings ?? DEFAULT_CONFIG`.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // Funciones cuya primera sentencia es 'worklet' (no las que solo contienen uno).
          selector:
            ":function[body.body.0.directive='worklet'] > AssignmentPattern[right.type=/^(Identifier|MemberExpression)$/]",
          message:
            'Un worklet no puede usar una variable como valor por defecto de un parámetro: no llega al hilo de UI. Resolverlo en el cuerpo (`param ?? CONSTANTE`).',
        },
      ],
    },
  },
  // Último: desactiva las reglas de estilo que chocan con Prettier y reporta
  // las diferencias de formato como errores de ESLint.
  eslintPluginPrettierRecommended,
]);
