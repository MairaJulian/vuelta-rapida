/**
 * react-native-audio-api es nativo: en Jest se usa el mock oficial de la biblioteca,
 * con las mismas clases (AudioContext, nodos, parámetros) sin sonido. Los tests que
 * necesitan revisar qué se reprodujo pasan su propio contexto (`createContext`).
 */
jest.mock('react-native-audio-api', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-audio-api/mock');
});
