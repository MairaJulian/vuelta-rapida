# RaceFlow

Flujo de la carrera: grilla, semáforo, carrera, pausa y llegada, con los eventos que escucha el resto de la app (sonido, vibración, pantallas). TypeScript puro y worklets: corre en el hilo de UI dentro del loop.

## Estados

```
grid ──startLights──> lights ──luces apagadas──> racing ──N vueltas──> finished
  └───────────┬──────────┴──────────┬──────────────┘
           pauseRace ⇄ resumeRace (vuelve al estado de origen)
restartRace: desde cualquier estado, carrera nueva en grid
```

| Estado | Qué pasa |
|---|---|
| `grid` | El auto quieto. Espera `startLights` (la pantalla la manda cuando los sonidos están listos). |
| `lights` | Se enciende una luz por segundo (la primera, al segundo). Con las cinco encendidas, una espera al azar de 0,5 a 1,5 s y se apagan juntas. El auto sigue sin simularse. |
| `racing` | El auto se simula. El cronómetro (`sim.tick`) arranca en 0 en el paso en que se apagan las luces. |
| `finished` | Al completar la última vuelta. El auto sigue sin acelerador y con freno hasta detenerse; el cronómetro queda en el total. |
| `paused` | No avanza nada: ni el semáforo ni el auto ni los tiempos. |

## API

| Función | Qué hace |
|---|---|
| `createRace(setup)` | Carrera nueva en la grilla. Sortea la espera del semáforo con `setup.seed`. |
| `advanceRace(race, frameMs, input, drivingConfig, circuit, stepConfig)` | Avanza un cuadro en pasos fijos. Suma los eventos de esos pasos a `events`. |
| `startLights` / `pauseRace` / `resumeRace` | Órdenes de la pantalla. Fuera del estado en que valen, devuelven la carrera tal cual. |
| `restartRace(race, setup)` | Carrera nueva, con el aviso `phase` hacia `grid`. |
| `takeRaceEvents(race)` | Retira los eventos pendientes: `{ race, events }`. |
| `getRaceLapView(race)` | `{ lap, totalLaps, lapTicks }` para el HUD. |
| `getRaceClockTicks(race)` | Cronómetro: desde la largada; tras la llegada, el total. |
| `getRaceResults(race)` | Total, vueltas, mejor vuelta y récord; `null` antes de la llegada. |
| `getFinishResults(event)` | Los mismos resultados, sacados del evento `finish`. |
| `getAllLightsOnTick` / `getLightsOutTick` | Pasos desde el comienzo del semáforo hasta las cinco luces y hasta la largada. |
| `shouldNotifyContact(...)` | Regla de los avisos de borde y de piano (ver abajo). |
| `DEFAULT_RACE_CONFIG` | 3 vueltas, 5 luces a 1 s, espera de 0,5 a 1,5 s, 0,5 s entre toques, 0,3 s entre pianos, freno de llegada 0,5. |

## Eventos (`RaceEvent`)

Todos llevan `tick`: el paso de la carrera (sin contar la pausa).

| Evento | Datos | Cuándo |
|---|---|---|
| `phase` | `from`, `to` | Cada cambio de estado, también la pausa, la vuelta de la pausa y el reinicio. |
| `lightOn` | `light` (1 a 5) | Se enciende una luz. |
| `lightsOut` | — | Se apagan las luces: la largada. |
| `lapCompleted` | `lap`, `totalLaps`, `lapTicks` | Termina una vuelta. Con `lap === totalLaps` es la última: le sigue `finish`. |
| `borderHit` | `impactSpeed` (m/s) | Empieza un contacto con el borde, si pasaron 0,5 s desde el último aviso. |
| `kerbEnter` | `speed` (m/s) | El auto entra a un piano, si pasaron 0,3 s desde el último aviso. |
| `newRecord` | `lapTicks`, `previousTicks` | Una vuelta mejora el récord vigente. |
| `recordTrace` | `lapTicks`, `sampleHz`, `samples[]` | Acompaña a `newRecord`: las muestras de esa vuelta (`[x, z, rumbo, ...]`, la última en la meta) para guardarla como fantasma. |
| `finish` | Los `RaceResults`: `totalTicks`, `lapTicks[]`, `bestLapTicks`, `bestLapIndex`, `newRecord`, `previousRecordTicks` | La llegada. |

## Ejemplo

```ts
// En el loop (hilo de UI):
const next = advanceRace(race.get(), frameMs, input.get(), drivingConfig, circuit, stepConfig);
const { race: delivered, events } = takeRaceEvents(next);
race.set(delivered);
if (events.length > 0) scheduleOnRN(dispatch, events); // al bus del hilo de JS
```

## Decisiones de diseño

- **Todo en pasos de simulación:** el semáforo, el cronómetro y los tiempos mínimos entre avisos. La misma semilla y la misma entrada dan exactamente la misma carrera, a cualquier fps.
- **La vuelta 1 se cuenta desde la largada**, como en una carrera real: el auto larga 15 m antes de la meta y el cronómetro arranca al apagarse las luces. Así el total es la suma de las vueltas y el reloj del HUD corre desde la largada. `LapTimer` sigue validando cada vuelta con las puertas del circuito; la carrera solo registra en qué paso terminó cada una.
- **Una vuelta deshecha no se cuenta dos veces:** si el auto vuelve marcha atrás sobre la meta, `LapTimer` deshace la vuelta, pero la carrera solo suma vueltas cuando el contador supera las que ya terminó.
- **Fantasma (hito 8):** `RaceState.lapTrace` acumula la pose del auto cada `getGhostSampleGap(stepHz)` pasos (30 muestras por segundo a 60 pasos) desde el inicio de la vuelta: la 1 desde que se apagan las luces, las siguientes desde cada cruce de meta. Solo la vuelta que mejora el récord sale en un evento (`recordTrace`); las demás se descartan al empezar la siguiente. `getRaceLapClockMs(race)` da el tiempo de la vuelta en curso con la fracción del paso, que es el reloj de la reproducción (`core/Ghost`).
- **Récord:** la carrera recibe el récord guardado (`setup.recordTicks`). Una vuelta que lo mejora lo reemplaza y se avisa con `newRecord`; las siguientes se comparan con el nuevo.
- **Avisos de contacto:** solo al empezar un contacto (deslizarse contra el borde es un solo toque) y con un tiempo mínimo desde el último, para que un roce que se corta y vuelve no se repita.
- **Eventos dentro del estado:** los pasos los juntan en `events` y el loop los retira con `takeRaceEvents`. Las órdenes de la pantalla (pausa, reinicio) también dejan su evento ahí, así todo sale por el mismo camino y una sola vez.
- **La llegada trae los resultados completos:** la pantalla de resultados sale del evento `finish` (`getFinishResults`), sin leer la carrera desde el hilo de JS, que lo bloquearía hasta que responda el hilo de UI.
- **Tras la llegada:** sin acelerador (`acceleration: 0`) y con `finishBrake`. Con aceleración 0 el freno no da marcha atrás, así que el auto se detiene y queda quieto. Ya no hay avisos.
- **La configuración va dentro del estado:** cambiar las vueltas desde el panel vale para la próxima carrera, no para la que está en curso.
- **Orden de las funciones worklet:** cada función va declarada antes de las que la usan (el plugin de worklets las convierte en constantes).
