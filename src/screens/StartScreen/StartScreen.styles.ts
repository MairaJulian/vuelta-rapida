import type { StartStep } from '@/core/PlayerPreferences';

/**
 * La entrada no dibuja nada, así que no tiene estilos: este archivo guarda su única
 * constante de presentación, la ruta de cada primer paso.
 */
export const START_HREFS = {
  'choose-control': '/control',
  calibrate: '/calibracion',
  drive: '/inicio',
} as const satisfies Record<StartStep, string>;
