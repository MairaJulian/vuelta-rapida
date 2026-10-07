import { resampleClosedPolyline, sampleClosedCatmullRom } from '@/core/CatmullRom';
import { createCircuit } from '@/core/Track';
import type { Circuit } from '@/core/Track';

import type { CircuitDefinition } from './Circuits.types';

/** Distancia entre puntos del trazado, en metros. */
export const TRACK_SPACING = 2;
/** Muestras por tramo entre puntos de control antes de remuestrear. */
const SAMPLES_PER_SEGMENT = 48;

/** Redondea a milímetros: el trazado queda prolijo al serializarlo. */
const toMillimeters = (value: number) => Math.round(value * 1000) / 1000 || 0;

/**
 * Arma el circuito: suaviza los puntos de control con una Catmull-Rom centrípeta
 * cerrada y la remuestrea cada `TRACK_SPACING` metros. El punto 0 es la meta.
 */
export function buildCircuit(definition: CircuitDefinition): Circuit {
  const smooth = sampleClosedCatmullRom(definition.controlPoints, SAMPLES_PER_SEGMENT);
  const { points } = resampleClosedPolyline(smooth, TRACK_SPACING);
  return createCircuit({
    id: definition.id,
    name: definition.name,
    centerline: points.map((point) => ({ x: toMillimeters(point.x), z: toMillimeters(point.z) })),
    width: definition.width,
    checkpointFractions: definition.checkpointFractions,
  });
}

/**
 * Autódromo del Lago (handoff, pantallas 05, 07 y 08): la silueta de su minimapa,
 * con el carácter de un circuito rápido de rectas largas. Unos 2,4 km y una vuelta
 * ideal de alrededor de 1:09.
 *
 * - Puntos del trazado del handoff (viewBox 100 × 60) a 11 m por unidad, centrados.
 * - Antihorario, en el orden del trazado del handoff: la recta principal va hacia +x.
 * - Dos curvas cerradas que obligan a frenar: la chicana al final de la recta y la
 *   horquilla del centro (la única a la derecha). El resto se toma a fondo.
 */
export const AUTODROMO_DEL_LAGO: CircuitDefinition = {
  id: 'autodromo-del-lago',
  name: 'Autódromo del Lago',
  width: 14,
  checkpointFractions: [1 / 3, 2 / 3],
  controlPoints: [
    { x: -93.5, z: 165 }, // Meta, donde la marca el handoff.
    { x: 22, z: 165 },
    { x: 132, z: 165 }, // Frenada.
    { x: 160.6, z: 167.2 }, // 1: chicana, derecha...
    { x: 174.9, z: 178.2 },
    { x: 185.9, z: 190.3 }, // ...e izquierda.
    { x: 201.3, z: 193.6 },
    { x: 214.5, z: 183.7 },
    { x: 231, z: 169.4 },
    { x: 269.5, z: 160.6 }, // 2: curva rápida a la izquierda.
    { x: 341, z: 126.5 },
    { x: 391.6, z: 63.8 },
    { x: 391.6, z: -16.5 }, // Subida.
    { x: 356.4, z: -110 },
    { x: 325.6, z: -167.2 }, // 3: curva de arriba a la derecha.
    { x: 281.6, z: -202.4 },
    { x: 224.4, z: -205.7 },
    { x: 169.4, z: -180.4 },
    { x: 33, z: -88 }, // Diagonal hacia el centro.
    { x: -81.4, z: -13.2 },
    { x: -127.6, z: 14.3 }, // 4: horquilla del centro, la curva más cerrada.
    { x: -141.9, z: 20.4 },
    { x: -151.8, z: 18.7 },
    { x: -158.4, z: 12.1 },
    { x: -160, z: 2.2 },
    { x: -158.4, z: -13.2 },
    { x: -158.4, z: -49.5 }, // Salida de la horquilla, subida.
    { x: -184.8, z: -143 },
    { x: -204.6, z: -198 }, // 5: curva de arriba a la izquierda.
    { x: -253, z: -224.4 },
    { x: -312.4, z: -209 },
    { x: -396, z: -127.6 }, // Bajada.
    { x: -442.2, z: -55 },
    { x: -455.4, z: 33 }, // 6: curva larga que desemboca en la recta principal.
    { x: -435.6, z: 116.6 },
    { x: -382.8, z: 158.4 },
    { x: -319, z: 165 },
    { x: -209, z: 165 },
  ],
};

/** Circuitos del juego, en el orden de la selección de pista. */
export const CIRCUIT_DEFINITIONS: readonly CircuitDefinition[] = [AUTODROMO_DEL_LAGO];

/** Circuito con el que arranca el juego mientras no hay selección de pista. */
export const DEFAULT_CIRCUIT: Circuit = buildCircuit(AUTODROMO_DEL_LAGO);
