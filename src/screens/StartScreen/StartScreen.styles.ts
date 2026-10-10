import type { StartStep } from '@/core/PlayerPreferences';

/**
 * La entrada no dibuja nada, así que no tiene estilos: este archivo guarda su única
 * constante de presentación, la ruta de cada primer paso. Con todo listo para manejar,
 * primero se elige quién juega.
 */
export const START_HREFS = {
  'choose-control': '/control',
  calibrate: '/calibracion',
  drive: '/jugadores',
} as const satisfies Record<StartStep, string>;
