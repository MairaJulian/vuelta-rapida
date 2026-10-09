# Track

El circuito como datos: un trazado central cerrado (lista de puntos) y un ancho. Define dónde se dibuja el asfalto, dónde larga el auto, dónde está la meta, hasta dónde puede ir el auto y cuánto avanzó. TypeScript puro.

Los circuitos del juego se definen con puntos de control en `core/Circuits`; aquí está la geometría que usan todos.

## Tipos

- `TrackData`: `{ centerline: TrackPoint[], width }`, en metros. El punto 0 es la meta; la carrera avanza en el orden de los índices y el último punto se une con el primero. Serializable.
- `Circuit`: `TrackData` más `{ id, name, distances, length, checkpoints, kerbs }`.
  - `distances[i]`: distancia desde la meta hasta el punto `i`.
  - `checkpoints`: los puntos de control intermedios, en metros desde la meta.
  - `kerbs`: los pianos (`KerbSection`: `{ start, length }`, en metros sobre el trazado). Un piano puede cruzar la meta.
  - `scenery` (opcional): la escenografía (`core/Scenery`). La suman `withScenery` o `withCircuitScenery`; la simulación no la usa.
  - Es lo que reciben la simulación y las vueltas. Serializable.
- `CircuitSpec`: `{ id, name, centerline, width, checkpointFractions }`, para armar un `Circuit`.
- `TrackPoint`: `{ x, z }`.
- `OvalSpec`: `{ straightLength, radius, width, segmentsPerCurve }`, medidas para generar un óvalo.
- `Pose`: `{ x, z, heading }`.
- `FinishLine`: `{ x, z, heading, length, thickness }`; la línea es perpendicular a `heading`.
- `FinishSign`: `{ x, z, rotation }`, dónde va el cartel "META".
- `CenterlineHit`: `{ x, z, distance, segment, t }`, el punto del trazado más cercano a una posición. `t` es la parte recorrida del segmento.

## API

| Exporta | Qué hace |
|---|---|
| `createCircuit(spec)` | Arma un `Circuit` a partir de un trazado: distancias, largo y puntos de control. |
| `getTrackProgress(circuit, x, z)` | Progreso: distancia desde la meta por el trazado, de 0 al largo de la vuelta. Worklet. |
| `getProgressAt(circuit, hit)` | Lo mismo, con el punto más cercano ya encontrado. Worklet. |
| `getProgressDelta(from, to, length)` | Avance entre dos progresos por el camino corto (negativo hacia atrás), también al cruzar la meta. Worklet. |
| `getNearestOnCenterline(track, x, z, segmentHint?)` | Punto del trazado más cercano. Con `segmentHint` busca solo cerca de ese segmento. Worklet. |
| `NEAREST_SEARCH_WINDOW` | Segmentos a cada lado que revisa la búsqueda local (25). |
| `getFinishLine(track)` | Meta en el punto 0, perpendicular al primer tramo. 1,8 m de grosor, como la bandera del handoff. |
| `getFinishSign(track, length, depth, gap)` | Dónde va el cartel "META": afuera del circuito, justo después de la línea, con el texto derecho. |
| `getLapDirection(track)` | 1 si la vuelta es en sentido horario (vista desde arriba), −1 si es antihorario. |
| `getStartPose(track)` | Largada: 15 m antes de la meta medidos sobre el trazado, mirando hacia ella. |
| `getCurveSections(track, maxRadius?)` | Tramos curvos (radio menor que `CURVE_MAX_RADIUS`, 150 m), de punta a punta, para dibujar los pianos. Une los que están separados por poco y descarta los muy cortos. |
| `getKerbSections(track, distances, length, maxRadius?)` | Los mismos tramos medidos sobre el trazado. `createCircuit` los guarda en `kerbs`. |
| `getKerbFactor(kerbs, length, progress)` | Cuánto del piano se puede pisar en ese punto, de 0 a 1: crece a lo largo de `KERB_TAPER` (4 m) en cada punta. Worklet. |
| `EDGE_WIDTH_RATIO` / `KERB_WIDTH_RATIO` | Ancho del borde blanco (120/110) y de los pianos (138/110) respecto del asfalto. Los usan el dibujo y el límite de pista. |
| `OVAL_TRACK` / `OVAL_CIRCUIT` | Óvalo de prueba para los tests: rectas de 200 m, curvas de 50 m de radio, 14 m de ancho (unos 714 m). |
| `createOvalTrack(spec)` / `createOvalCenterline(spec)` | Óvalo tipo estadio, o solo sus puntos. |

## Ejemplo

```ts
import { DEFAULT_CIRCUIT } from '@/core/Circuits';
import { getProgressDelta, getStartPose, getTrackProgress } from '@/core/Track';

const start = getStartPose(DEFAULT_CIRCUIT);
const before = getTrackProgress(DEFAULT_CIRCUIT, car.x, car.z);
// ... un paso de simulación ...
const after = getTrackProgress(DEFAULT_CIRCUIT, car.x, car.z);
const advanced = getProgressDelta(before, after, DEFAULT_CIRCUIT.length);
```

## Decisiones de diseño

- **Pista como datos, no como forma:** cualquier circuito es una lista de puntos. Los del juego salen de puntos de control suavizados (`core/Circuits`); el óvalo queda como pista de prueba conocida para los tests.
- **Progreso como distancia por el trazado:** la distancia acumulada del segmento más cercano más la parte recorrida. Moverse a lo ancho de la pista no lo cambia. La validación de los circuitos (`core/TrackValidation`) asegura que el punto más cercano nunca salte a otro tramo, así que el progreso es continuo.
- **Búsqueda local del punto más cercano:** la simulación corre en el hilo de UI, con Hermes y sin JIT, y un circuito tiene más de mil segmentos. Con el segmento del paso anterior se revisan solo 51 (unos 100 m). Si el resultado no tiene sentido (más lejos que un ancho de pista), se repite la búsqueda completa.
- **Curvas detectadas por curvatura:** el giro en cada punto dividido por el largo medio de sus tramos. Contar solo el giro fallaría en el óvalo: los puntos donde la curva se une con una recta larga también giran, y la recta inferior quedaría marcada como curva.
- **Pianos de una pieza por curva** (`CURVATURE_WINDOW`, `CURVE_MERGE_GAP`, `CURVE_MIN_LENGTH`): con puntos cada 2 m la curvatura medida contra el vecino tiene ruido, y las curvas suaves rondan el umbral de 150 m de radio. Sin ajustes, el Autódromo del Lago daba 24 pianos partidos. Por eso:
  - la curvatura se mide sobre 8 m de trazado;
  - los tramos separados por hasta 24 m se unen (las dos mitades de la chicana, la salida de la horquilla);
  - los de menos de 20 m se descartan.
  
  Quedan 6 pianos, uno por curva. En el óvalo, con puntos más separados, el resultado es el mismo de antes.
- **Pianos como datos del circuito:** salen de la misma detección de curvas con que se dibujan, una sola vez al armar el circuito. La simulación los consulta con el progreso del auto en cada paso (seis tramos: una cuenta barata).
- **El punto 0 es la meta** y el orden de los puntos es el sentido de la carrera: la largada, la meta y las vueltas salen de ahí.
- **14 m de ancho** (unos 7 autos). Más ancho que la proporción del handoff, para que la pista perdone más mientras se aprende a manejar.
- **El cartel "META" va afuera del circuito:** el lado se deduce del sentido de la vuelta. En sentido horario el interior queda a la derecha de la marcha.
- **Orden de las funciones worklet:** el plugin de worklets convierte cada función en una constante, así que una función tiene que estar declarada antes de las que la llaman.
- La geometría vive en `core` porque la usan las reglas de carrera (límites, meta y vueltas), no solo el render.
