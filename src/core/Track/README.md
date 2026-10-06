# Track

El circuito como datos: un trazado central cerrado (lista de puntos) y un ancho. Define dónde se dibuja el asfalto, dónde larga el auto, dónde está la meta y hasta dónde puede ir el auto. TypeScript puro.

## Tipos

- `TrackData`: `{ centerline: TrackPoint[], width }`, en metros. El punto 0 es la meta; la carrera avanza en el orden de los índices y el último punto se une con el primero. Serializable.
- `TrackPoint`: `{ x, z }`.
- `OvalSpec`: `{ straightLength, radius, width, segmentsPerCurve }`, medidas para generar un óvalo.
- `Pose`: `{ x, z, heading }`.
- `FinishLine`: `{ x, z, heading, length, thickness }`; la línea es perpendicular a `heading`.
- `CenterlineHit`: `{ x, z, distance, segment }`, el punto del trazado más cercano a una posición.

## API

| Exporta | Qué hace |
|---|---|
| `DEFAULT_TRACK` | Óvalo de prueba: rectas de 200 m, curvas de 50 m de radio, 14 m de ancho (unos 714 m por vuelta). |
| `createOvalTrack(spec)` | Óvalo tipo estadio como `TrackData`. |
| `createOvalCenterline(spec)` | Solo los puntos del trazado del óvalo. |
| `getFinishLine(track)` | Meta en el punto 0, perpendicular al primer tramo. |
| `getStartPose(track)` | Largada: 15 m antes de la meta medidos sobre el trazado, mirando hacia ella. |
| `getNearestOnCenterline(track, x, z)` | Punto del trazado más cercano y su distancia. Worklet: lo usa el límite de pista en cada paso. |
| `getCurveSections(track, maxRadius?)` | Tramos curvos (radio menor que `CURVE_MAX_RADIUS`, 150 m), de punta a punta, para los pianos. |

## Ejemplo

```ts
import { createCarState } from '@/core/DrivingModel';
import { DEFAULT_TRACK, getStartPose } from '@/core/Track';

const start = getStartPose(DEFAULT_TRACK);
const car = createCarState(start.x, start.z, start.heading);

// Una pista nueva es una lista de puntos y un ancho:
const custom: TrackData = { centerline: [{ x: 0, z: 0 }, { x: 80, z: 0 }, ...], width: 12 };
```

## Decisiones de diseño

- **Pista como datos, no como forma:** cualquier circuito es una lista de puntos. El óvalo es solo el primero, generado con `createOvalTrack`. Las curvas se describen con muchos puntos (32 segmentos por semicírculo: el arco y la cuerda se separan 6 cm).
- **Curvas detectadas por curvatura:** el giro en cada punto dividido por el largo medio de sus tramos. Contar solo el giro fallaría en el óvalo: los puntos donde la curva se une con una recta larga también giran, y la recta inferior quedaría marcada como curva.
- **El punto 0 es la meta** y el orden de los puntos es el sentido de la carrera: la largada, la meta y, más adelante, las vueltas salen de ahí.
- **14 m de ancho** (unos 7 autos) en lugar de los 8 m del hito 2. Más ancho que la proporción del handoff, para que la pista perdone más mientras se aprende a manejar.
- **Búsqueda del punto más cercano en todos los segmentos:** con 67 puntos cuesta muy poco por paso. Si una pista futura pasa dos tramos muy cerca uno del otro, convendrá buscar solo cerca del segmento anterior.
- **Óvalo en sentido horario**, con la largada mirando hacia +x en la recta superior: todas las curvas son a la derecha y en un celular en horizontal se ve más recta por delante.
- La geometría vive en `core` porque la usan las reglas de carrera (límites, meta y vueltas), no solo el render.
