const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'android/*', '.expo/*', 'docs/*']),
  expoConfig,
  // Último: desactiva las reglas de estilo que chocan con Prettier y reporta
  // las diferencias de formato como errores de ESLint.
  eslintPluginPrettierRecommended,
]);
