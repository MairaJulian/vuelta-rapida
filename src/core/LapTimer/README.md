# LapTimer

Vueltas y tiempos: cuándo empieza y termina cada vuelta, cuánto duró y cuál fue la mejor. Los tiempos se miden en pasos de simulación, no con el reloj del sistema, así son exactos y deterministas. TypeScript puro.

## Tipos

- `LapState`: `{ tick, progress, gatesPassed, lapStartTick, lapTicks, bestLapTicks }`. Serializable.
  - `lapTicks`: duración de cada vuelta completa, en pasos.
  - `bestLapTicks`: la más corta, o `null`.
- `LapGates`: `{ length, checkpoints }`, lo que necesita del circuito (un `Circuit` lo cumple).

## API

| Exporta | Qué hace |
|---|---|
| `createLapState()` | Vueltas sin empezar. |
| `stepLapTimer(state, progress, gates, tick)` | Procesa el progreso de un paso de simulación. Worklet: corre dentro de `DrivingSim`. |
| `getCurrentLap(state)` | Vuelta en curso, desde 1; 0 antes de cruzar la meta. |
| `getCurrentLapTicks(state)` | Pasos que lleva la vuelta en curso. |
| `ticksToMs(ticks, stepHz)` | Pasos a milisegundos. |
| `formatLapTime(ms)` | "m:ss.mmm", como en el handoff ("1:04.318"). |
| `formatGapSeconds(ms)` | Distancia en segundos con dos decimales, sin signo, para frases: "0.42". Redondea para arriba, así nunca dice "0.00" si hay diferencia. |
| `formatLapDelta(ms)` | Diferencia con signo, como en el handoff: "−0.578" (con el menos tipográfico, U+2212), "+0.236", "±0.000". Desde un minuto, "+1:02.345". |
| `MAX_PROGRESS_STEP` | Avance máximo creíble en un paso: 10 m. |

## Ejemplo

```ts
let laps = createLapState();
// En cada paso fijo, con el progreso del auto sobre el trazado:
laps = stepLapTimer(laps, progress, circuit, tick);

formatLapTime(ticksToMs(getCurrentLapTicks(laps), 60)); // "0:42.117"
```

## Reglas

- **Puertas en orden:** la meta y los puntos de control intermedios del circuito forman una secuencia que se repite cada vuelta (meta, 1/3, 2/3, meta...). Solo cuenta cruzar hacia adelante la puerta que sigue. Cruzar hacia atrás la última pasada la deshace.
- **Largada:** el auto larga 15 m antes de la meta; la vuelta 1 empieza al cruzarla.
- **Vuelta completa:** cruzar la meta con todos los puntos de control pasados. Su duración es la diferencia entre los pasos de los dos cruces.
- **Ir y volver sobre la meta no suma vueltas:** si se la cruza hacia atrás, se deshace lo último (la largada o la última vuelta). Al cruzarla otra vez hacia adelante, la vuelta se completa con su tiempo real, que incluye la ida y vuelta.
- **Atajos:** un avance de más de `MAX_PROGRESS_STEP` en un paso no es real (el auto recorre menos de un metro por paso) y no cruza ninguna puerta. Si con eso se saltea un punto de control, la vuelta no se completa hasta pasarlo.

## Decisiones de diseño

- **Progreso en lugar de líneas geométricas:** cada puerta es una distancia sobre el trazado. Cruzarla es que el progreso pase por ella, hacia adelante o hacia atrás. Funciona en cualquier circuito sin dibujar ni intersectar líneas, y en cualquier lugar del ancho de la pista.
- **Pasos enteros:** a 60 pasos por segundo la resolución es de 16,7 ms. Es exacta y reproducible: la misma carrera da siempre el mismo tiempo, condición para el auto fantasma. Interpolar el cruce dentro del paso daría milisegundos, pero sumaría complejidad sin necesidad por ahora.
- **Deshacer en vez de bloquear:** con una pila de puertas pasadas, ir y volver nunca cuenta doble y no hacen falta reglas especiales para la meta.
- **El récord guardado no vive aquí:** `bestLapTicks` es la mejor de la sesión. La de cada circuito se guarda en las preferencias (`bestLapsMs`).
